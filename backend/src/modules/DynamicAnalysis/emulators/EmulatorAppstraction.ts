// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IEmulator from "./IEmulator.js";
import { ILogger } from "../../../logger/ILogger.js";

import { ensureSdkmanager, getAndroidDevToolPath } from "andromatic";
import { extendedAndroidApi } from "../../../helpers/ExtendedAndroidApi.js";

import terminate from "terminate/promise";
import { execa } from "execa";
import { logExecaError } from "../../../utils.js";
import { ChildProcess } from "child_process";

export default class EmulatorAppstraction implements IEmulator {
  name: string = EmulatorAppstraction.name;
  process?: ChildProcess;

  constructor(
    public avdName: string,
    private logger: ILogger,
  ) {}

  async start(): Promise<void> {
    // new solution found in https://github.com/tweaselORG/cyanoacrylate/blob/main/src/util.ts#L317
    const { env } = await ensureSdkmanager();
    const toolPath = await getAndroidDevToolPath("emulator");

    try {
      const process = execa(toolPath, ["-avd", this.avdName], { env });
      const platformApi = extendedAndroidApi(
        { platform: "android", runTarget: "emulator", capabilities: [] },
        this.logger,
      );
      // wait for device to be started
      await platformApi.waitForDevice(400);
      // store emulator process to be stopped later on
      this.process = process;
    } catch (err) {
      logExecaError(
        err,
        "Failed running command to start emulator",
        this.name,
        this.logger,
      );
    }
  }

  async stop(): Promise<void> {
    if (!this.process?.pid) {
      throw Error("Failed to stop emulator - Emulator not running");
    }
    try {
      await terminate(this.process.pid, "SIGINT", { timeout: 15000 });
    } catch (err) {
      throw new Error("Failed to stop emulator", { cause: err });
    }
  }
}
