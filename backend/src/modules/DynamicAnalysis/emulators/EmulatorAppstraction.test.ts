// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SSELogger } from "../../../logger/SSELogger.js";
import EmulatorAppstraction from "./EmulatorAppstraction.js";
const standaloneTest = async () => {
  // source: https://stackoverflow.com/questions/71727391/nodejs-how-to-press-any-key-to-continue-and-get-the-key-value
  const keypress = async () => {
    return new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", () => {
        process.stdin.pause();
        resolve();
      });
    });
  };
  const emulator = new EmulatorAppstraction("tweasel-test", new SSELogger());
  await emulator.start();
  console.log("emulator running, press any key to continue");
  await keypress();
  await emulator.stop();
};

// start test
standaloneTest();
