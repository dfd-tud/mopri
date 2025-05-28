// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PCAPdroidManager from "modules/DynamicAnalysis/collectors/dynamic/PCAPdroidManager.js";
import { PCAPdroidDownloader } from "./PCAPdroidDownloader.js";
import { ResultStorageHelper } from "helpers/ResultStorageHelper.js";
import { extendedAndroidApi } from "helpers/ExtendedAndroidApi.js";
import { SSELogger } from "logger/SSELogger.js";

async function test() {
  const downloader = new PCAPdroidDownloader("v1.8.4");
  const path = await downloader.retrieveApk();
  console.log(path);
}

async function testPCAPdroidManager() {
  const logger = new SSELogger();
  const androidApi = extendedAndroidApi({
    platform: "android",
    // our deviceType "physical" is named "device" in library appstraction
    runTarget: "emulator",
    // frida is only needed when friTap is used
    capabilities: ["root"],
  },logger);
  const downloader = new PCAPdroidDownloader("v1.8.4");
  const storageHelper = new ResultStorageHelper("test");
  const manager = new PCAPdroidManager(
    "de.tagesschau",
    androidApi,
    downloader,
    storageHelper,
    logger,
  );
  await manager.setup();
}

(async () => await testPCAPdroidManager())();
