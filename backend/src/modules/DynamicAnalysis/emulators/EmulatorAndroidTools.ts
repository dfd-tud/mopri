// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IEmulator from "./IEmulator.js";
import Android from "@wtto00/android-tools";
import { platformApi } from "appstraction";
import { getAndroidTools } from "utils.js";

export default class EmulatorAndroidTools implements IEmulator {
  name: string = EmulatorAndroidTools.name;
  private androidTools?: Android;
  private runningEmulatorId?: string;

  constructor(public avdName: string) {}

  async start(): Promise<void> {
    this.androidTools = await getAndroidTools();
    const result = await this.androidTools.start({
      avd: this.avdName,
      verbose: true,
      // setting this to true takes the emulator a very long time to start
      wipeData: false,
    });
    const emulatorId = result.id;
    // wait for emulator boot to be completed
    await this.androidTools.ensureReady(emulatorId);
    // appstraction way of waiting for device is more accurate -> just to be sure
    await platformApi({
      platform: "android",
      runTarget: "emulator",
      capabilities: [],
    }).waitForDevice(400);
    this.runningEmulatorId = emulatorId;
  }

  async stop(): Promise<void> {
    if (!this.runningEmulatorId) throw new Error("No emulator running.");
    // should not happen
    if (!this.androidTools) throw new Error("Android tools not available.");

    await this.androidTools.stop(this.runningEmulatorId);
  }
}
