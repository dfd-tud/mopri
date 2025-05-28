// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { RecordingMeta, RecordingResultTypes } from "@mopri/schema";
import { VenvOptions, getVenv } from "autopy";
import { ResultStorageHelper } from "helpers/ResultStorageHelper.js";
import { SSELogger } from "../../../../../logger/SSELogger.js";
import { NetworkTrafficRecordingPCAP } from "./NetworkTrafficRecordingPCAP.js";

// test NetworkTrafficRecordingPCAP
const runTest = async () => {
  const networkTrafficRecordingPCAP: NetworkTrafficRecordingPCAP =
    new NetworkTrafficRecordingPCAP(
      "de.tagesschau_3.5.1",
      "emulator",
      "meta-only",
      new ResultStorageHelper("test"),
      new SSELogger(),
    );
  await networkTrafficRecordingPCAP.setup();
  await networkTrafficRecordingPCAP.startCollection();
  // const keypress = async () => {
  //   return new Promise<void>((resolve) => {
  //     process.stdin.resume();
  //     process.stdin.once("data", () => {
  //       process.stdin.pause();
  //       resolve();
  //     });
  //   });
  // };
  // console.log("program still running, press any key to continue");
  // await keypress();
  await new Promise((resolve) => setTimeout(resolve, 10000));
  //console.log("received key");
  await networkTrafficRecordingPCAP.stopCollection();
  await networkTrafficRecordingPCAP.cleanup();
};

async function execaTest() {
  const networkTrafficRecordingPCAP: NetworkTrafficRecordingPCAP =
    new NetworkTrafficRecordingPCAP(
      "tv.arte.plus7_3.6.1",
      "physical",
      "friTap",
      new ResultStorageHelper("test"),
      new SSELogger(),
    );
  await networkTrafficRecordingPCAP.startCollection();
  const friTapVenvSettings: VenvOptions = {
    name: "NetworkTrafficRecording",
    pythonVersion: "~3.11", // Use any Python 3.11.x version.
    requirements: [{ name: "fritap", version: "==1.1.1.7" }],
  };
  const python = await getVenv(friTapVenvSettings);
  const proc = python("script", [
    "-c",
    "friTap -m --spawn --pcap mycapture.pcap tv.arte.plus7",
  ]);
  //const proc = python("friTap", [
  //  "-m",
  //  "--spawn",
  //  "--keylog",
  //  "key.log",
  //  // format result as json
  //  "de.tagesschau",
  //]);

  proc.stdout?.on("data", (data) => console.log(data.toString()));

  setTimeout(async () => {
    console.log("killed");
    proc.kill();
    try {
      const result = await proc;
    } catch (error) {
      console.log(error);
    }
  }, 10000);
}
// execaTest();

const runPostprocessingTest = async () => {
  const storageHelper = new ResultStorageHelper("27bb12275aa18334");
  const recordings = await storageHelper.readResultFromJsonFile<RecordingMeta>(
    "recordings.json",
    "collection",
  );
  Object.keys(recordings).forEach((k) => {
    const recording = recordings[k as RecordingResultTypes];
    if (recording) {
      storageHelper.registerResult(
        "collection",
        recording?.moduleName,
        k as RecordingResultTypes,
        recording?.analysisType,
        recording?.file,
        recording?.startCaptureTime,
      );
    }
  });
  const pcapRecorder = new NetworkTrafficRecordingPCAP(
    "test",
    "physical",
    "friTap",
    storageHelper,
    new SSELogger(),
  );
  await pcapRecorder.postProcess();
  storageHelper.storeRecordingMeta();
};
runTest();
//runPostprocessingTest();
