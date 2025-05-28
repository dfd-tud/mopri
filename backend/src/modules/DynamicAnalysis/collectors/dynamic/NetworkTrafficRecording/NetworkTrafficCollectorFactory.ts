// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ILogger } from "../../../../../logger/ILogger.js";
import { DeviceType, TrafficRecordingMethod } from "@mopri/schema";

import { IResultStorageHelper } from "../../../../../helpers/ResultStorageHelper.js";

import { NetworkTrafficRecordingTweasel } from "./NetworkTrafficRecordingTweasel.js";
import { NetworkTrafficRecordingPCAP } from "./NetworkTrafficRecordingPCAP.js";
import INetworkTrafficCollector from "./INetworkTrafficCollector.js";

export class NetworkTrafficCollectorFactory {
  static createNetworkTrafficCollector(
    type: TrafficRecordingMethod,
    appPackageStorageId: string,
    deviceType: DeviceType,
    storageHelper: IResultStorageHelper,
    logger: ILogger,
  ): INetworkTrafficCollector {
    switch (type) {
      case TrafficRecordingMethod.TweaselBasic:
        return new NetworkTrafficRecordingTweasel(
          appPackageStorageId,
          deviceType,
          "basic",
          storageHelper,
          logger,
        );
      case TrafficRecordingMethod.TweaselWithHttpTools:
        return new NetworkTrafficRecordingTweasel(
          appPackageStorageId,
          deviceType,
          "httpTools",
          storageHelper,
          logger,
        );
      case TrafficRecordingMethod.TweaselWithAPKPatching:
        throw new Error("Not implemented");
      case TrafficRecordingMethod.PCAPDroidWithFriTap:
        return new NetworkTrafficRecordingPCAP(
          appPackageStorageId,
          deviceType,
          "friTap",
          storageHelper,
          logger,
        );
      case TrafficRecordingMethod.PCAPDroidMetaOnly:
        return new NetworkTrafficRecordingPCAP(
          appPackageStorageId,
          deviceType,
          "meta-only",
          storageHelper,
          logger,
        );
      default:
        throw new Error("Invalid NetworkTrafficCollector");
    }
  }
}
