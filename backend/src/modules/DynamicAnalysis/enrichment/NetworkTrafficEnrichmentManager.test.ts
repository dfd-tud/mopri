// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ResultStorageHelper } from "../../../helpers/ResultStorageHelper.js";
import { NetworkTrafficEnrichmentManager } from "./NetworkTrafficEnrichmentManager.js";
import { SSELogger } from "../../../logger/SSELogger.js";
import { RecordingMeta, RecordingResultTypes } from "@mopri/schema";

const runTest = async () => {
  const storageHelper = new ResultStorageHelper("48582ba0752bfc00");
  await storageHelper.loadResultRegister();
  const eM = new NetworkTrafficEnrichmentManager(
    storageHelper,
    new SSELogger(),
  );
  const pcapngFile = storageHelper.getRegisteredResult(
    "collection",
    RecordingResultTypes.NetworkPCAPng,
  )?.file;
  if (pcapngFile) {
    const output = await eM.retrieveHostnamesFromPCAPng(pcapngFile);
    console.log(output);
  }
  //await eM.enrichReceivers();
  //await eM.execute();
};

//runTest();
const runTest2 = async () => {
  const storageHelper = new ResultStorageHelper("5e1d7e2cbcaea03d");
  await storageHelper.loadResultRegister();
  const eM = new NetworkTrafficEnrichmentManager(
    storageHelper,
    new SSELogger(),
  );
  const output = await eM.matchAdapters();
  const storageHelper2 = new ResultStorageHelper("387a09d6c0b941ee");
  await storageHelper2.loadResultRegister();
  const eM2 = new NetworkTrafficEnrichmentManager(
    storageHelper,
    new SSELogger(),
  );
  const adapter2 = await eM2.matchAdapters();
  console.log(deepEqual(output, adapter2));
  //await eM.enrichReceivers();
  //await eM.execute();
};

runTest2();

function deepEqual(obj1: any, obj2: any): boolean {
  // Check if both are the same reference
  if (obj1 === obj2) return true;

  // Check if both are objects (and not null)
  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return false;
  }

  // Get keys of both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if the number of keys is the same
  if (keys1.length !== keys2.length) return false;

  // Check each key in obj1
  for (const key of keys1) {
    // Check if key exists in obj2
    if (!keys2.includes(key)) return false;

    // Recursively check values
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}
