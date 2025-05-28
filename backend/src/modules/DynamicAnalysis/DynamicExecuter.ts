// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ILogger } from "../../logger/ILogger.js";
import { IResultStorageHelper } from "../../helpers/ResultStorageHelper.js";
import IDynamicCollector from "./collectors/dynamic/IDynamicCollector.js";
import IEmulator from "./emulators/IEmulator.js";
import IStaticCollector from "./collectors/static/IStaticCollector.js";
import IDynamicExecuter from "./IDynamicExecuter.js";
import INetworkTrafficEnrichmentManager from "./enrichment/INetworkTrafficEnrichmentManager.js";

import { NetworkTrafficCollectorFactory } from "./collectors/dynamic/NetworkTrafficRecording/NetworkTrafficCollectorFactory.js";
import { DeviceDataCollector } from "./collectors/static/DeviceDataCollector.js";
import ScreenRecorder from "./collectors/dynamic/ScreenRecording.js";
import { NetworkTrafficEnrichmentManager } from "./enrichment/NetworkTrafficEnrichmentManager.js";
import EmulatorAppstraction from "./emulators/EmulatorAppstraction.js";
import { ensureDevicesConnected } from "../../utils.js";

import { AnalysisConfigDynamic } from "@mopri/schema";

export class DynamicExecuter implements IDynamicExecuter {
  public name: string = DynamicExecuter.name;
  private runningCollectors: IDynamicCollector[] = [];
  private runningEmulator?: IEmulator;
  private staticCollectors: IStaticCollector[] = [];
  private enrichmentManager: INetworkTrafficEnrichmentManager;

  /*
   * Internal function to resolve the promise returned in waitForStop
   * Used in stopRecording()
   */
  private resolveStopPromise?: () => void;

  constructor(
    public appPackageStorageId: string,
    public userConfigDyn: AnalysisConfigDynamic,
    public storageHelper: IResultStorageHelper,
    public logger: ILogger,
  ) {
    // initialize tools
    this.enrichmentManager = new NetworkTrafficEnrichmentManager(
      storageHelper,
      logger,
    );
  }

  async startRecording(): Promise<void> {
    this.logger.log(this.name, "Starting dynamic analysis");
    if (!this.userConfigDyn.trafficRecordingOptions?.trafficRecordingMethod)
      throw new Error("Missing trafficRecordingMethod");

    switch (this.userConfigDyn.deviceType) {
      case "emulator":
        if (!this.userConfigDyn.emulatorOptions?.emulatorName)
          throw new Error(
            "When device is set to emulator a emulatorName must be provided.",
          );
        await ensureDevicesConnected((message: string) => {
          this.logger.log(this.name, message, "callToAction");
        }, 0);
        //const emulator = new EmulatorAndroidTools(
        //  this.userConfigDyn.emulatorOptions?.emulatorName,
        //);
        const emulator = new EmulatorAppstraction(
          this.userConfigDyn.emulatorOptions.emulatorName,
          this.logger,
        );
        this.logger.log(this.name, "Emulator starting");
        await emulator.start();
        this.logger.log(this.name, "Emulator started", "start");
        this.runningEmulator = emulator;
        break;
      case "physical":
        // ensure that one device is connected
        await ensureDevicesConnected((message: string) =>
          this.logger.log(this.name, message, "callToAction"),
        );
        break;
      default:
        throw new Error("Selected device type unkown");
    }

    // init recorders
    const trafficRecorder =
      NetworkTrafficCollectorFactory.createNetworkTrafficCollector(
        this.userConfigDyn.trafficRecordingOptions?.trafficRecordingMethod,
        this.appPackageStorageId,
        this.userConfigDyn.deviceType,
        this.storageHelper,
        this.logger,
      );

    const interactionRecorder = new ScreenRecorder(
      this.storageHelper,
      this.logger,
    );

    // setup device
    if (trafficRecorder.setup) {
      await trafficRecorder.setup();
    }

    // collect device data
    if (this.userConfigDyn.trafficRecordingOptions?.enableDeviceDataCapture) {
      const deviceDataCollector: IStaticCollector = new DeviceDataCollector(
        this.storageHelper,
        this.logger,
        this.userConfigDyn.deviceType,
      );
      // this collector array is not utilized somewhere else, still want to have in an object wide array
      // especially for the uml diagram to have a conncetion of this class to the IStaticCollector
      this.staticCollectors.push(deviceDataCollector);
      try {
        await deviceDataCollector.execute();
      } catch (e) {
        this.logger.error(this.name, "Failed to collect device data");
      }
    }

    // start dynamic collectors
    // screen recording
    if (this.userConfigDyn.trafficRecordingOptions.enableScreenRecording) {
      try {
        await interactionRecorder.startCollection();
        this.runningCollectors.push(interactionRecorder);
      } catch (e) {
        console.error(e);
        this.logger.error(this.name, "Failed to start screen recording");
      }
    }
    // traffic recording -> store runningCollector first to be able to stop and cleanup even if startCollection fails
    this.runningCollectors.push(trafficRecorder);
    await trafficRecorder.startCollection();

    this.logger.log(this.name, "Interact with the app!", "callToAction");
  }
  async stopRecording(): Promise<void> {
    // stop all collection processes in reverse order (first in last out)
    for (const c of this.runningCollectors.slice().reverse()) {
      try {
        await c.stopCollection();
        this.logger.log(
          this.name,
          `Successfully stopped collection ${c.name}`,
          "stop",
        );
      } catch (e) {
        this.logger.error(this.name, `Failed to stop service ${c.name}: ${e}`);
      }
    }
    // execute cleanup steps
    for (const c of this.runningCollectors.slice().reverse()) {
      if (c.cleanup) {
        try {
          await c.cleanup();
          this.logger.log(
            this.name,
            `Successfully executed cleanup for ${c.name}`,
            "stop",
          );
        } catch (e) {
          this.logger.error(
            this.name,
            `Failed to execute cleanup for service ${c.name}: ${e}`,
          );
        }
      }
    }

    // stop emulator after the cleanup if one is running
    if (this.runningEmulator) {
      this.runningEmulator.stop();
    }

    // execute post processing
    for (const c of this.runningCollectors.slice().reverse()) {
      if (c.postProcess) {
        try {
          await c.postProcess();
          this.logger.log(
            this.name,
            `Successfully executed processing for ${c.name}`,
            "stop",
          );
        } catch (e) {
          this.logger.error(
            this.name,
            `Failed to execute postprocessing for service ${c.name}: ${e}`,
          );
        }
      }
    }

    if (this.resolveStopPromise) {
      this.resolveStopPromise(); // Resolve the promise if set
    }
    this.logger.log(this.name, "Recording ended", "stop");
  }
  waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveStopPromise = resolve; // Store the resolver function
    });
  }
  async enrich(): Promise<void> {
    try {
      this.logger.log(this.name, "Enrich traffic", "start");
      await this.enrichmentManager.execute();
      this.logger.log(this.name, "Successfully enriched traffic", "stop");
    } catch (error) {
      console.error(error);
      this.logger.error(this.name, "Failed to enrich traffic: " + error);
    }
  }
}
