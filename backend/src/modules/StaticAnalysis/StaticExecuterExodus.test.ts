// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ResultStorageHelper } from "helpers/ResultStorageHelper.js";
import { SSELogger } from "logger/SSELogger.js";
import { StaticExecuterExodus } from "modules/StaticAnalysis/StaticExecuterExodus.js";
async function test() {
  const sseLogger = new SSELogger();
  const storageHelper = new ResultStorageHelper("1cd6d69b44f22bce");
  await storageHelper.loadResultRegister();
  const meta = await storageHelper.getAnalysisMeta();
  const staticExecuter = new StaticExecuterExodus(
    meta.appPackageStorageId,
    storageHelper,
    sseLogger,
  );
  await staticExecuter.executeAnalysis();
  await staticExecuter.enrich();
  await storageHelper.storeRecordingMeta();
}
test();
