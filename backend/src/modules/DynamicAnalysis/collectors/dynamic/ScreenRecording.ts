// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IDynamicCollector from "./IDynamicCollector.js";
import { IResultStorageHelper } from "../../../../helpers/ResultStorageHelper.js";
import { ILogger } from "../../../../logger/ILogger.js";

import { getCurrentTimeUnix } from "../../../../utils.js";
import { RecordingResultTypes } from "@mopri/schema";

import { runAndroidDevTool } from "andromatic";
import terminate from "terminate/promise";
import { ensureSdkmanager, getAndroidDevToolPath } from "andromatic";
import { execa } from "execa";
import { ChildProcess } from "child_process";

export default class ScreenRecorder implements IDynamicCollector {
  name: string = ScreenRecorder.name;
  private recordingProcess?: ChildProcess;
  private onDeviceStoragePath = "/sdcard/recording.mp4";
  private startCaptureTime?: number;
  public outputFile = "recording.mp4";

  constructor(
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
  ) {}

  async startCollection(): Promise<void> {
    this.logger.log(this.name, "Start screen recording", "start");
    // can't use runAndroidDevTool because somehow it returns a promise -> reimplented the function
    // see https://github.com/tweaselORG/cyanoacrylate/blob/main/src/util.ts#L317
    const { env } = await ensureSdkmanager();
    const toolPath = await getAndroidDevToolPath("adb");

    this.recordingProcess = execa(
      toolPath,
      ["shell", "screenrecord", this.onDeviceStoragePath],
      { env, reject: false },
    );
    this.startCaptureTime = getCurrentTimeUnix();
    // if reject:true => rejects promise on error => fails also for sigint
    // but if any error should occur => uncomment this line and set reject to true, to investigate error
    // this.recordingProcess.catch((e) => console.error(e));
  }

  async stopCollection(): Promise<void> {
    if (!this.recordingProcess?.pid)
      throw new Error("Recording process not running / has no pid.");
    try {
      await terminate(this.recordingProcess.pid, "SIGINT", { timeout: 15000 });
      this.logger.log(this.name, "Screen recording stopped", "stop");
    } catch (err) {
      console.error(err);
      this.logger.error(
        this.name,
        "Failed to kill screen recording, it is still running.",
      );
    }

    // store recorded video
    const recordingStoragePath = this.storageHelper.getStorageFilePath(
      this.outputFile,
      "collection",
    );
    await runAndroidDevTool("adb", [
      "pull",
      this.onDeviceStoragePath,
      recordingStoragePath,
    ]);
    this.storageHelper.registerResult(
      "collection",
      this.name,
      RecordingResultTypes.ScreenRecording,
      "dynamic",
      this.outputFile,
      this.startCaptureTime,
    );
    console.log("Retrieved file");
  }
}
