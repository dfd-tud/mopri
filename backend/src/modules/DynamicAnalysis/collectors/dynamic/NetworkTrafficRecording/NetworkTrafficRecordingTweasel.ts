// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import INetworkTrafficCollector from "./INetworkTrafficCollector.js";
import { ILogger } from "../../../../../logger/ILogger.js";
import { CollectionState } from "../IDynamicCollector.js";
import {
  Analysis,
  AnalysisOptions,
  AppAnalysis,
  AppAnalysisResult,
  startAnalysis,
  SupportedCapability,
  SupportedPlatform,
  SupportedRunTarget,
  TweaselHar,
} from "cyanoacrylate";
import { IResultStorageHelper } from "../../../../../helpers/ResultStorageHelper.js";
import { DeviceType } from "@mopri/schema";
import { ApkHelper } from "../../../../../helpers/ApkHelper.js";
import { extendedAndroidApi } from "../../../../../helpers/ExtendedAndroidApi.js";
import { RecordingResultTypes } from "@mopri/schema";

export class NetworkTrafficRecordingTweasel
  implements INetworkTrafficCollector
{
  public name = "NetworkTrafficRecording";
  private analysisOptions: AnalysisOptions<
    "android",
    SupportedRunTarget<"android">,
    SupportedCapability<"android">[]
  >;
  private analysis?: Analysis<
    SupportedPlatform,
    SupportedRunTarget<SupportedPlatform>,
    SupportedCapability<SupportedPlatform>[]
  >;
  private appAnalysis?: AppAnalysis<
    SupportedPlatform,
    SupportedRunTarget<SupportedPlatform>,
    SupportedCapability<SupportedPlatform>[]
  >;
  private state: CollectionState = "init";
  constructor(
    private appPackageStorageId: string,
    private deviceType: DeviceType,
    private analysisStrategy: "basic" | "httpTools" | "apkPatching",
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
  ) {
    this.analysisOptions = {
      platform: "android",
      runTarget: this.deviceType == "physical" ? "device" : this.deviceType,
      capabilities:
        this.analysisStrategy == "httpTools"
          ? ["frida", "certificate-pinning-bypass"]
          : [],
    };
  }
  async setup(): Promise<void> {
    // prepare and start Analysis
    this.analysis = await startAnalysis(this.analysisOptions);

    // setup device
    this.logger.log(this.name, "Setup device");
    await this.analysis?.ensureDevice();

    this.logger.log(this.name, "Retrieve app analysis object");

    const apkHelper = new ApkHelper(this.appPackageStorageId);
    const testAppPath = await apkHelper.getPackageFilePath();
    this.appAnalysis = await this.analysis?.startAppAnalysis(testAppPath);

    this.logger.log(this.name, `Install ${this.appAnalysis?.app.name}`);
    await this.appAnalysis.installApp();
    //this.logger.log(this.name, "Setting app permissions...");
    //await this.appAnalysis.setAppPermissions();

    this.state = "setup";
  }

  async startCollection(): Promise<void> {
    if (this.state != "setup") {
      throw new Error(
        "You need to call setup() before being able to startCollection()",
      );
    }
    if (!this.appAnalysis) {
      throw new Error(
        "appAnalysis not initialised. Did you call setup before?",
      );
    }
    this.logger.log(this.name, "Starting Traffic Collection");
    await this.appAnalysis.startTrafficCollection(this.name);
    this.logger.log(this.name, "Start app");
    // todo: make more robust against crashing emulator
    await this.appAnalysis.startApp();

    this.state = "running";
  }

  async stopCollection(): Promise<void> {
    if (!this.appAnalysis) {
      throw new Error("Cannot stop collection - No analysis running");
    }
    // stop Analysis
    this.logger.log(this.name, "Stopping Traffic Collection...");
    try {
      await this.appAnalysis.stopTrafficCollection();
    } catch (e) {
      this.logger.log(
        this.name,
        ("Error while stopping traffic collection " + e) as string,
        "error",
      );
    }
    this.logger.log(this.name, "Getting Results...");
    try {
      const analysisResults: AppAnalysisResult = await this.appAnalysis.stop();
      // cyanoacrylate stores traffic in har format as a Record<string,TweaselHar> in the AppAnalysisResult
      // we use this.name as the record name
      const traffic: TweaselHar | undefined =
        analysisResults.traffic[this.name];
      // throw error if traffic could not be retrieved
      if (!traffic) throw Error("Tweasel traffic result empty.");
      // save har to result dir
      await this.storageHelper.saveResultToJsonFile(
        traffic,
        "networkTraffic",
        "har",
        "collection",
      );
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.NetworkHar,
        "dynamic",
        "networkTraffic.har",
      );
    } catch (e) {
      this.logger.log(
        this.name,
        ("Error while getting analysis result " + e) as string,
        "error",
      );
    }
    await this.analysis?.stop();
    this.state = "stoped";
  }

  async cleanup(): Promise<void> {
    // uinstall analysed app
    await this.appAnalysis?.uninstallApp();
    this.logger.log(this.name, `Uninstalled ${this.appAnalysis?.app.name}`);

    // uninstall wireguard
    await this.analysis?.platform.uninstallApp("com.wireguard.android");
    this.logger.log(this.name, "Uninstalled wireguard");

    // remove Frida
    if (this.analysisOptions.capabilities.includes("frida")) {
      // use custom androidApi object that has function to remove frida
      // todo: combine with cyanoacrylate so that this.analysis can be used instead
      const androidApi = extendedAndroidApi(
        {
          platform: "android",
          runTarget: this.analysisOptions.runTarget,
          capabilities: ["root"],
        },
        this.logger,
      );
      await androidApi.uninstallFrida();
      this.logger.log(this.name, "Uninstalled frida");
    }
  }
}
