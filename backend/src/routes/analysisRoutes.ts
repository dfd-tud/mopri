/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  AnalysisStageSchema,
  AnalysisMeta,
  RecordingResultTypes,
  StaticResultFileMeta,
  AnalysisStage,
} from "@mopri/schema";
import { analysisConfigToAnalysisMeta } from "../utils.js";

import { Router, Request, Response } from "express";
import { ResultStorageHelper } from "../helpers/ResultStorageHelper.js";
import { serializeSSEvent, SSELogger } from "../logger/SSELogger.js";
import AnalysisOrchestration from "../modules/AnalysisOrchestrationModule.js";
import { Log } from "@mopri/schema";
import { FileNotFoundError } from "../types/Errors.js";
import path from "path";
import { NetworkTrafficEnrichmentManager } from "../modules/DynamicAnalysis/enrichment/NetworkTrafficEnrichmentManager.js";

let runningAnalysis: AnalysisOrchestration | null;
let sseLogger = new SSELogger();

const router = Router();

// get all past analysis
// returns UserConfig[]
router.get("/", async (req: Request, res: Response) => {
  const analysisList = await ResultStorageHelper.getAnalysisList();
  res.json(analysisList);
});

// get UserConfig for specific analysisId
router.get("/:analysisId", async (req: Request, res: Response) => {
  if (!req.params.analysisId) {
    res.status(400).send("Missing parameter analysisId.");
    return;
  }
  const storageHelper = new ResultStorageHelper(req.params.analysisId);
  try {
    const loadedResult = await storageHelper.getAnalysisMeta();
    res.json(loadedResult);
  } catch (e) {
    if (e instanceof FileNotFoundError) {
      res.status(404).send("No result with that name");
    } else {
      res.status(500).send("Failed to load data.");
    }
  }
});

router.get("/download/:analysisId", async (req: Request, res: Response) => {
  const analysisId = req.params.analysisId;
  if (!analysisId) {
    res.status(400).send("Missing parameter analysisId.");
    return;
  }

  const storageHelper = new ResultStorageHelper(analysisId);
  try {
    const archiver = await storageHelper.getResultArchive();
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=results_${analysisId}.zip`,
    });
    archiver.pipe(res);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return res.status(404).send(`No analysis with id "${analysisId}" found.`);
    }
    console.error("Error zipping directory:", error);
    res.status(500).send("Error zipping directory");
  }
});

router.get(
  "/result/:analysisId/:stage/:resultType",
  async (req: Request, res: Response) => {
    const analysisId = req.params.analysisId;
    const stage = req.params.stage as AnalysisStage | undefined;
    const resultType = req.params.resultType as
      | RecordingResultTypes
      | undefined;

    // todo: improve check with zod and send detailed error message
    if (
      !(
        analysisId &&
        stage &&
        resultType &&
        AnalysisStageSchema.safeParse(stage).success &&
        Object.values(RecordingResultTypes).includes(resultType)
      )
    )
      return res.status(400).send("Missing parameters");

    const storageHelper = new ResultStorageHelper(analysisId);
    try {
      await storageHelper.loadResultRegister();
      const recording = storageHelper.getRegisteredResult(stage, resultType);
      if (!recording)
        return res.status(404).send(`Result of type ${resultType} not found`);

      // load result (either directly as json object or return the staticURL to the file otherwise)
      // todo: add fileType (e.g. json) as parameter to RecordingsMeta
      if ([".json", ".har"].includes(path.extname(recording.file))) {
        // load json result and return it
        return res.json(
          await storageHelper.readResultFromJsonFile(recording.file, stage),
        );
      } else {
        const staticUrl = `${req.protocol}://${req.get("host")}/result/${analysisId}/${stage}/${recording.file}`;
        const result: StaticResultFileMeta = {
          staticUrl,
          startCaptureTime: recording.startCaptureTime ?? 0,
        };
        return res.json(result);
      }
    } catch (e) {
      console.error(e);
      return res.status(500).send("Failed to read result file");
    }
  },
);

// create and start new Analysis
router.post("/", async (req: Request, res: Response) => {
  if (!runningAnalysis) {
    const result = analysisConfigToAnalysisMeta.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path[0], // Get the field name
        message: err.message, // Get the error message
      }));

      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      });
    }
    const analysisMeta: AnalysisMeta = result.data;
    runningAnalysis = new AnalysisOrchestration(analysisMeta, sseLogger);
    runningAnalysis.executeAnalysis();
  }

  // update connection to stay open for server site events
  res.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  // Tell the client to retry every 10 seconds if connectivity is lost
  res.write("retry: 10000\n\n");
  sseLogger.subscribe((log: Log) => {
    res.write(serializeSSEvent(log.type == "done" ? "DONE" : "NEW_LOG", log));
    if (log.type == "done") {
      console.log("ending analysis");
      res.end();
      runningAnalysis = null;
    }
  });
});

router.patch(
  "/updateTrafficEnrichment/:analysisId",
  async (req: Request, res: Response) => {
    const analysisId = req.params.analysisId;
    if (!analysisId) {
      res.status(400).send("Missing analysisId");
      return;
    }

    try {
      const storageHelper = new ResultStorageHelper(analysisId);
      await storageHelper.loadResultRegister();
      const enrichmentManager = new NetworkTrafficEnrichmentManager(
        storageHelper,
        new SSELogger(),
      );
      await enrichmentManager.execute();
      await storageHelper.storeRecordingMeta();
      res.json({
        message: `Successfully updated traffic enrichment for analysis ${analysisId}`,
      });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: `Failed to update traffic enrichment for analysis ${analysisId}`,
      });
      return;
    }
  },
);

router.delete("/runningRecordings/:id", async (req: Request, res: Response) => {
  const stopped = await runningAnalysis?.stopDynamicAnalysis();
  if (stopped) {
    // todo: improve returns
    res.json({ status: "stopped" });
  } else {
    res.status(400).json({ status: "not running" });
  }
});

router.delete("/:analysisId", async (req: Request, res: Response) => {
  const analysisId = req.params.analysisId;
  if (analysisId) {
    const storageHelper = new ResultStorageHelper(analysisId);
    try {
      await storageHelper.deleteAnalysisResults();
    } catch (e) {
      if (e instanceof FileNotFoundError) {
        res
          .status(404)
          .json({ message: `Could not find analysis with id ${analysisId}` });
        return;
      } else {
        res
          .status(500)
          .json({
            message: `Failed to delete analysis with id ${analysisId} due to an unkown error - please try again.`,
          });
        console.error(e);
        return;
      }
    }
    res.status(200).json({
      message: `Successfully deleted analysis with id ${req.params.analysisId}`,
    });
  }
});

export default router;
