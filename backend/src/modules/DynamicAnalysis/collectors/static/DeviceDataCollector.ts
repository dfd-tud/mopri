// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IStaticCollector from "./IStaticCollector.js";
import { IResultStorageHelper } from "../../../../helpers/ResultStorageHelper.js";
import { ILogger } from "../../../../logger/ILogger.js";

import { DeviceData, DeviceType, RecordingResultTypes } from "@mopri/schema";
import { SupportedCapability, SupportedRunTarget } from "appstraction";
import {
  ExtendedAndroidApi,
  extendedAndroidApi,
} from "../../../../helpers/ExtendedAndroidApi.js";

export class DeviceDataCollector implements IStaticCollector {
  public name = DeviceDataCollector.name;
  private outputFilename = "deviceData";
  private platform: ExtendedAndroidApi<
    SupportedRunTarget<"android">,
    SupportedCapability<"android">[]
  >;
  constructor(
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
    deviceType: DeviceType,
  ) {
    this.platform = extendedAndroidApi(
      {
        platform: "android",
        // our deviceType "physical" is named "device" in library appstraction
        runTarget: deviceType == "physical" ? "device" : "emulator",
        capabilities: ["root"],
      },
      this.logger,
    );
  }

  async execute() {
    this.logger.log(this.name, "Started to collect device data", "start");
    let adId: string | undefined = undefined;
    try {
      adId = await this.platform.getAdId();
    } catch (e) {
      console.error(e);
      this.logger.error(this.name, "Failed to retrieve adId from device");
    }
    let imei: string | undefined = undefined;
    try {
      imei = await this.platform.getIMEI();
    } catch (e) {
      console.error(e);
      this.logger.error(this.name, "Failed to retrieve imei from device");
    }

    const deviceData: DeviceData = {
      platform: this.platform.target.platform,
      runTarget: this.platform.target.runTarget,
      deviceName: await this.platform.getDeviceAttribute("name"),
      osVersion: await this.platform.getDeviceAttribute("osVersion"),
      osBuild: await this.platform.getDeviceAttribute("osBuild"),
      manufacturer: await this.platform.getDeviceAttribute("manufacturer"),
      model: await this.platform.getDeviceAttribute("model"),
      modelCodeName: await this.platform.getDeviceAttribute("modelCodeName"),
      architectures: await this.platform.getDeviceAttribute("architectures"),
      adId,
      imei,
    };
    // todo error handling
    try {
      const filename = await this.storageHelper.saveResultToJsonFile(
        deviceData,
        this.outputFilename,
        "json",
        "collection",
      );
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.DeviceData,
        "dynamic",
        filename,
      );
    } catch (e) {
      console.error(e);
      throw new Error("Failed to store device data", { cause: e });
    }
    this.logger.log(this.name, "Successfully collected device data", "stop");
  }
}
