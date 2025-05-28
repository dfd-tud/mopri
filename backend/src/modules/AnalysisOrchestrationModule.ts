// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IDynamicExecuter from "./DynamicAnalysis/IDynamicExecuter.js";
import { DynamicExecuter } from "./DynamicAnalysis/DynamicExecuter.js";
import { ILogger } from "../logger/ILogger.js";
import {
  StaticExecuterExodus,
} from "./StaticAnalysis/StaticExecuterExodus.js";

import {
  ResultStorageHelper,
  IResultStorageHelper,
} from "../helpers/ResultStorageHelper.js";
import { AnalysisMeta } from "@mopri/schema";

interface IAnalysisOrchestration {
  name: string;
  executeAnalysis(): Promise<void>;
  stopDynamicAnalysis(): Promise<boolean>;
}

export default class AnalysisOrchestration implements IAnalysisOrchestration {
  public name: string = AnalysisOrchestration.name;

  private runningDynamicExecutor?: IDynamicExecuter;
  private storageHelper: IResultStorageHelper;
  private appPackageStorageId: string;

  constructor(
    public analysisMeta: AnalysisMeta,
    public logger: ILogger,
  ) {
    this.storageHelper = new ResultStorageHelper(this.analysisMeta.analysisId);
    this.appPackageStorageId = analysisMeta.appPackageStorageId;
  }

  private async staticAnalysis() {
    const staticCollector = new StaticExecuterExodus(
      this.appPackageStorageId,
      this.storageHelper,
      this.logger,
    );

    await staticCollector.executeAnalysis();
    await staticCollector.enrich();
  }

  private async dynamicAnalysis() {
    const dynamicExecutor = new DynamicExecuter(
      this.appPackageStorageId,
      this.analysisMeta.dynamicConfig,
      this.storageHelper,
      this.logger,
    );
    try {
      await dynamicExecutor.startRecording();
      this.runningDynamicExecutor = dynamicExecutor;
      await dynamicExecutor.waitForStop();
      await dynamicExecutor.enrich();
    } catch (e) {
      console.error(e);
      this.logger.error(
        this.name,
        `Failed to start dynamic analysis - stopping now. <Cause>${e}</Cause>`,
      );
      await dynamicExecutor.stopRecording();
    }
  }

  async stopDynamicAnalysis(): Promise<boolean> {
    if (this.runningDynamicExecutor) {
      await this.runningDynamicExecutor.stopRecording();
      return true;
    }
    return false;
  }

  async executeAnalysis() {
    try {
      await this.storageHelper.ensureResultDirsExist();
      // store userConfig
      await this.storageHelper.saveResultToJsonFile(
        this.analysisMeta,
        "UserConfig",
        "json",
      );
      // run static analysis
      if (this.analysisMeta.staticConfig.enableExodusModule) {
        try {
          await this.staticAnalysis();
        } catch (error) {
          this.logger.error(this.name, "Failed to run static analysis" + error);
        }
      }
      // run dynamic analysis
      if (this.analysisMeta.dynamicConfig.enableTrafficRecording) {
        if (this.runningDynamicExecutor) {
          // improve error handling when executor is already running
          this.logger.error(this.name, "DynamicExecutor already running");
        } else {
          try {
            await this.dynamicAnalysis();
          } catch (error) {
            this.logger.error(
              this.name,
              "Failed to run dynamic analysis" + error,
            );
          }
        }
      }

      // mock analysis
      if (
        !this.analysisMeta.staticConfig.enableExodusModule &&
        !this.analysisMeta.dynamicConfig.enableTrafficRecording
      ) {
        // dummy
        await new Promise((resolve) => {
          let secondsPassed = 0;

          const interval = setInterval(() => {
            secondsPassed++;
            this.logger.log(
              "test",
              `Elapsed time: ${secondsPassed} second(s)`,
              "log",
            );
            if (secondsPassed === 4) {
              clearInterval(interval);
              resolve("Promise resolved after 4 seconds");
            }
          }, 1000);
        });
      }

      // store registered recordings meta information
      try {
        await this.storageHelper.storeRecordingMeta();
      } catch (e) {
        this.logger.error(this.name, "Failed to store recording meta");
      }
      this.logger.log(
        AnalysisOrchestration.name,
        this.analysisMeta.analysisId,
        "done",
      );
    } catch (e) {
      console.error(e);
    }
  }
}
