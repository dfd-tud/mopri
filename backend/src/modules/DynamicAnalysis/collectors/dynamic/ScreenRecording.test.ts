// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ResultStorageHelper } from "helpers/ResultStorageHelper.js";
import { SSELogger } from "../../../../logger/SSELogger.js";
import ScreenRecorder from "./ScreenRecording.js";

async function runTest() {
  const screenRecorder = new ScreenRecorder(
    new ResultStorageHelper("test"),
    new SSELogger(),
  );
  await screenRecorder.startCollection();
  await new Promise((resolve) => setTimeout(resolve, 10000));
  await screenRecorder.stopCollection();
}

runTest();
