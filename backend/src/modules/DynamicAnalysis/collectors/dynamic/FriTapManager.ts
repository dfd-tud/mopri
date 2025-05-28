// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { IResultStorageHelper } from "../../../../helpers/ResultStorageHelper.js";
import { ILogger } from "../../../../logger/ILogger.js";
import IDynamicCollector from "./IDynamicCollector.js";

import { RecordingResultTypes } from "@mopri/schema";
import { Readable } from "stream";

import { ExtendedAndroidApi } from "../../../../helpers/ExtendedAndroidApi.js";
import { SupportedRunTarget, SupportedCapability } from "appstraction";
import { VenvOptions, getVenv } from "autopy";
import terminate from "terminate/promise";
import { logExecaError } from "../../../../utils.js";
import { ChildProcess } from "child_process";

export default class FriTapManager implements IDynamicCollector {
  public name = FriTapManager.name;
  private friTapProcess?: ChildProcess;
  private friTapVenvSettings: VenvOptions = {
    name: this.name,
    pythonVersion: "~3.11", // Use any Python 3.11.x version.
    requirements: [{ name: "fritap", version: "==1.2.3.0" }],
  };
  public constructor(
    private testAppPackageName: string,
    private platformApi: ExtendedAndroidApi<
      SupportedRunTarget<"android">,
      SupportedCapability<"android">[]
    >,
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
  ) {}

  async setup(): Promise<void> {
    try {
      this.logger.log(this.name, "Installing frida...", "start");
      // ensure frida
      // internal function from appstraction -> todo: find better way to handle this?
      await this.platformApi._internal.ensureFrida();
      this.logger.log(this.name, "Installing frida done", "stop");
    } catch (error) {
      logExecaError(error, "Failed to install Frida", this.name, this.logger);
    }
    try {
      const fridaServerVersion = await this.platformApi.getFridaVersion();
      console.log("Frida-Server version: " + fridaServerVersion);
    } catch (e) {
      console.error(
        "Could not retrieve version of the installed frida server.",
      );
      console.error(e);
    }
  }

  async startCollection(): Promise<void> {
    // start Frida --> although it should already be running
    // sometimes there was an error where Frida was not started => execute again
    // if Frida is already installed this will not reinstall it
    await this.platformApi._internal.ensureFrida();
    const python = await getVenv(this.friTapVenvSettings);

    const outputFile = "tlskeys.log";

    const keyLogFilePath = this.storageHelper.getStorageFilePath(
      outputFile,
      "collection",
    );
    // todo: should only be registered if it actually got recorded!
    this.storageHelper.registerResult(
      "collection",
      this.name,
      RecordingResultTypes.NetworkTLSKeyLog,
      "dynamic",
      outputFile,
    );

    const friTapCommand = `friTap -m --spawn --keylog ${keyLogFilePath} ${this.testAppPackageName}`;

    const restartLimit = 5; // Set a limit for restarts
    let restartCount = 0;
    let isStable = false; // Reset the stability flag for each new process
    let timer: NodeJS.Timeout | null = null;

    const { stdout } = await python("friTap", ["--version"]);
    console.log("FriTap version: " + stdout);

    // restart friTap multiple times if it crahes -> happened because the spawned app crashed the last time -> worked when starting friTap a second time
    return new Promise<void>((resolve, reject) => {
      const startProcess = () => {
        // execute fritap within script (pseudo shell) as a workaround to capture stdout (was empty without)
        const proc = python("script", ["-c", friTapCommand]);

        // Set this.friTapProcess to the current process
        this.friTapProcess = proc;

        // Intercept terminal output and log error messages
        const readableStream: Readable | null = proc.stdout;
        if (readableStream) {
          readableStream.setEncoding("utf8");
          readableStream.on("data", (outputLine: string) => {
            //console.log(outputLine);
            if (outputLine.toLowerCase().includes("error")) {
              this.logger.log(this.name, "FriTap: " + outputLine, "error");
            }
          });
        }

        proc.on("exit", (exitCode) => {
          if (!isStable && restartCount < restartLimit) {
            restartCount++;
            console.log(
              `FriTap exited with code ${exitCode} - Restarting FriTap (${restartCount}/${restartLimit})...`,
            );
            startProcess(); // Restart the process
          } else if (isStable) {
            console.log(
              `FriTap exited with code ${exitCode} - Not restarting since it was stable`,
            );
          } else {
            console.error("Reached maximum restart limit for FriTap.");
            reject(
              new Error("FriTap failed to start after multiple attempts."),
            );
          }
        });

        // Set a timer to mark the process as stable after 5 seconds
        if (timer != null) {
          timer.refresh();
        } else {
          timer = setTimeout(() => {
            isStable = true;
            resolve();
          }, 5000); // 5000 milliseconds = 5 seconds
        }
      };

      startProcess(); // Initial process start
    });
  }
  async stopCollection(): Promise<void> {
    if (this.friTapProcess) {
      try {
        await terminate(this.friTapProcess.pid, "SIGINT", { timeout: 15000 });
        this.logger.log(this.name, "FriTap stopped", "stop");
      } catch (err) {
        console.error(err);
        this.logger.error(
          this.name,
          "Failed to kill FriTap process - It is still running",
        );
      }
    }
  }
  async cleanup(): Promise<void> {
    await this.platformApi.uninstallFrida();
    this.logger.log(this.name, "Uninstalled frida");
  }
}
