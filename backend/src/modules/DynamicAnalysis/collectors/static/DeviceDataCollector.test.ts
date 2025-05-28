// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ResultStorageHelper } from "helpers/ResultStorageHelper.js";
import { SSELogger } from "../../../../logger/SSELogger.js";
import { DeviceDataCollector } from "./DeviceDataCollector.js";

const runTest = async () => {
  const storageHelper = new ResultStorageHelper("test");
  await storageHelper.loadResultRegister();
  const deviceDataCollector = new DeviceDataCollector(
    storageHelper,
    new SSELogger(),
    "physical",
  );
  await deviceDataCollector.execute();
  await storageHelper.storeRecordingMeta();
};

runTest();
