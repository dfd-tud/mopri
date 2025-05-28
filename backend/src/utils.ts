/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { AnalysisMeta, analysisConfigSchema } from "@mopri/schema";
import Android, { Device } from "@wtto00/android-tools";
import { getAndroidDevToolPath } from "andromatic";
import crypto from "crypto";
import zlib from "zlib";
import {
  TooManyDevicesConnectedError,
  NoDeviceConnectedError,
} from "./types/Errors.js";
import { ILogger } from "./logger/ILogger.js";
import path from "path";
import fs from "fs/promises";

/**
 * Retrieves the ID of the connected Android device.
 *
 * @async
 * @function getConnectedDeviceId
 * @returns {Promise<string>} The ID of the connected device.
 * @throws {TooManyDevicesConnectedError} If more than one device is connected.
 * @throws {NoDeviceConnectedError} If no device is connected.
 */
export const getConnectedDeviceId = async (): Promise<string> => {
  const androidTools = await getAndroidTools();
  const devices: Device[] = await androidTools.devices();
  if (devices.length > 1) throw new TooManyDevicesConnectedError();
  const deviceID = devices[0]?.name;
  if (!deviceID) throw new NoDeviceConnectedError();
  return deviceID;
};

/**
 * Waits for a specified amount of time.
 *
 * @param {number} milliseconds - The amount of time to wait in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export const wait = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/**
 * Ensures that that either 0 or 1 device is connected. If the expected device count is not met, it calls the provided
 * failure callback and waits for a specified duration before retrying. If devices are still
 * connected after the maximum number of retries, an error is thrown.
 *
 * @async
 * @function ensureDevicesConnected
 * @param {(message: string) => void} onFail - A callback function to be called when devices are connected.
 * @param { 0 | 1} [expectedDeviceCount=1] - Number of devices that should be connected
 * @param {number} [retries=6] - The number of times to retry checking for connected devices.
 * @param {number} [waitFor=10000] - The amount of time to wait (in milliseconds) between retries.
 * @returns {Promise<void>} A promise that resolves when the function completes.
 * @throws {DevicesStillConnectedError} If devices are still connected after maximum retries.
 */
export async function ensureDevicesConnected(
  onFail: (message: string) => void,
  expectedDeviceCount: 0 | 1 = 1,
  retries: number = 6,
  waitFor: number = 10000,
): Promise<void> {
  if (retries < 0) {
    throw new Error("Retries must be a non-negative integer.");
  }
  if (waitFor <= 0) {
    throw new Error("Wait time must be a positive integer.");
  }
  // ensure no devices connected
  const androidTools = await getAndroidTools();
  let devices: Device[] = [];
  for (let attempt = 0; attempt < retries; attempt++) {
    devices = await androidTools.devices();
    const actualDeviceCount = devices.length;
    if (actualDeviceCount != expectedDeviceCount) {
      const message =
        expectedDeviceCount == 0
          ? `Too many devices connected (expected ${expectedDeviceCount}, but got ${actualDeviceCount}) - please disconnect devices accordingly`
          : "No devices connected for analysis - please connect a device";
      onFail(message + ` - Retrying attempt: ${attempt + 1}/${retries}`);
      // don't wait after last retry
      if (attempt + 1 < retries) {
        onFail(`Retrying in ${waitFor}ms`);
        await wait(waitFor);
      }
    } else return;
  }
  const actualDeviceCount = devices.length;
  if (actualDeviceCount != expectedDeviceCount) {
    if (actualDeviceCount > 0) throw new TooManyDevicesConnectedError();
    else throw new NoDeviceConnectedError();
  }
}
export const getAndroidTools = async (): Promise<Android> => {
  // andromatic install it's own tools that can have a different version and therefore different capabilities then the default sytem one (if installed)
  // e.g. avdmanager list devices might differ
  const avdmanagerToolPath = await getAndroidDevToolPath("avdmanager");
  const emulatorToolPath = await getAndroidDevToolPath("emulator");
  const sdkManagerToolPath = await getAndroidDevToolPath("sdkmanager");
  const adbToolPath = await getAndroidDevToolPath("adb");
  return new Android({
    avdmanager: avdmanagerToolPath,
    emulator: emulatorToolPath,
    sdkmanager: sdkManagerToolPath,
    adb: adbToolPath,
    debug: false,
  });
};

interface ParsedDeviceId {
  numericId: number; // Numeric ID
  stringId: string; // String representation
}

/**
 * Parses a string containing an AVD Manager device ID as returned by avdmanager.
 * The input string should be in the format 'numericId or "stringId"'.
 *
 * @param inputId - A string representing the device ID in the format 'numericId or "stringId"'.
 * @returns An object containing the numeric ID and string ID of the device.
 * @throws Error if the input format is invalid.
 *
 * @example
 * const { numericId, stringId } = parseAVDManagerDeviceId('16 or "Nexus One"');
 * console.log(numericId); // Output: 16
 * console.log(stringId);   // Output: 'Nexus One'
 *
 * @example
 * const { numericId, stringId } = parseAVDManagerDeviceId('5 or "medium_phone"');
 * console.log(numericId); // Output: 5
 * console.log(stringId);   // Output: 'medium_phone'
 */
export function parseAVDManagerDeviceId(inputId: string): ParsedDeviceId {
  // Use a regular expression to extract the numeric ID and string ID
  const match = inputId.match(/(\d+)\s+or\s+"([^"]+)"/);

  if (match && match[1] && match[2]) {
    const numericId = parseInt(match[1], 10); // Extract numeric ID
    const stringId = match[2]; // Extract string ID

    return { numericId, stringId }; // Return as an object
  } else {
    throw new Error("Invalid input format");
  }
}

/**
 * Translates the CPU architecture of the backend server executing this Node.js application
 * into the equivalent Android Virtual Device (AVD) CPU architecture
 *
 * @returns AVD architecture string
 * @see: https://github.com/wtto00/android-tools/blob/main/src/util.ts#L188
 */

/**
* SPDX-SnippetBegin
* SPDX-License-Identifier: AGPL-3.0-or-later 
* SPDX-SnippetCopyrightText: Copyright (c) 2023 简静凡 
*/
export function getLocalArch() {
  if (process.arch === "arm") return "armeabi-v7a";
  if (process.arch === "arm64") return "arm64-v8a";
  if (process.arch === "ia32") return "x86";
  if (process.arch === "x64") return "x86_64";
  throw new Error("Could not detect architecture");
}
// SPDX-SnippetEnd

/**
 * Transforms the analysis configuration into a analysisInfo.
 *
 * This function generates a unique analysis ID and sets the creation date
 * for the user configuration object based on the provided frontend data.
 *
 * @param {UserConfigBody} body - The frontend user configuration data.
 * @returns {UserConfig} The transformed backend user configuration object.
 * @see https://example.com/documentation  // Replace with actual documentation link if available
 */
export const analysisConfigToAnalysisMeta = analysisConfigSchema.transform(
  (body): AnalysisMeta => ({
    analysisId: crypto.randomBytes(8).toString("hex"),
    createdAt: new Date(),
    ...body,
  }),
);

export function logExecaError(err: unknown, errorMsg: string): void;
export function logExecaError(
  err: unknown,
  errorMsg: string,
  context: string,
  logger: ILogger,
): void;
export function logExecaError(
  err: unknown,
  errorMsg: string,
  context?: string,
  logger?: ILogger,
) {
  const errorOutput =
    err instanceof Object && "stderr" in err ? err.stderr : err;
  const fullErrorMsg = errorMsg + errorOutput;
  if (logger && context) {
    logger.log(context, errorMsg + errorOutput, "error");
  } else {
    console.error(fullErrorMsg);
  }
}

/**
 * Retrieves the current time in Unix timestamp format.
 *
 * This function returns the current time as a Unix timestamp, which is the
 * number of seconds that have elapsed since the Unix epoch (January 1, 1970,
 * 00:00:00 UTC). The returned value is an integer representing the time in
 * seconds, which is commonly used in various applications for time-related
 * calculations and comparisons.
 *
 * The function uses `Date.now()` to obtain the current time in milliseconds
 * and then divides it by 1000 to convert it to seconds. The result is rounded
 * down to the nearest whole number using `Math.floor()`.
 *
 * @returns A number representing the current time in Unix timestamp format.
 *
 * @example
 * const currentTime = getCurrentTimeUnix();
 * console.log(currentTime); // Outputs the current Unix timestamp, e.g., 1633036800
 */
export function getCurrentTimeUnix() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Decompresses a base64-encoded gzipped string and returns the resulting string.
 *
 * @param {string} base64String - The base64-encoded string that represents gzipped data.
 * @returns {Promise<string>} A promise that resolves to the decompressed string.
 * @throws {Error} If the input string cannot be decoded or decompressed.
 */
export async function decompressGzipFromBase64(
  base64String: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Decode the base64 string to a buffer
    const buffer = Buffer.from(base64String, "base64");

    // Gunzip the buffer
    zlib.gunzip(buffer, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.toString()); // Convert the result buffer to a string
    });
  });
}

/**
 * Parses a query string from a URL and converts it into an array of objects
 * containing the parameter names and their corresponding values.
 *
 * @param {string} input - The query string to parse, typically starting with a '?'
 *                         followed by key-value pairs (e.g., "?param1=value1&param2=value2").
 *
 * @returns {{ name: string; value: string }[]} An array of objects, each containing
 *          the `name` and `value` of a parameter. If the input string is empty or
 *          contains no parameters, an empty array is returned.
 *
 * @example
 * // Example usage:
 * const params = parseURLSearchParams('?param1=value1&param2=value2');
 * console.log(params);
 * // Output: [{ name: 'param1', value: 'value1' }, { name: 'param2', value: 'value2' }]
 */
export function parseURLSearchParams(
  input: string,
): { name: string; value: string }[] {
  const params = new URLSearchParams(input);
  // Convert to an array of { name, value } objects
  return Array.from(params.entries()).map(([key, value]) => ({
    name: key,
    value: value,
  }));
}

export function getHostnameFromUrl(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname;
}

/**
 * Ensures that a directory exists. If it does not exist, it will be created.
 * @param dirPath - The path of the directory to ensure exists.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  // Resolve the directory path
  const resolvedPath = path.resolve(dirPath);
  try {
    // Check if the directory exists
    await fs.access(resolvedPath);
  } catch (error) {
    // If the directory does not exist, create it
    if (isErrnoException(error) && error.code === "ENOENT") {
      await fs.mkdir(resolvedPath, { recursive: true });
      console.log(`Directory created: ${resolvedPath}`);
    } else {
      // If the error is not about the directory not existing, rethrow it
      throw error;
    }
  }
}

/**
 * Type guard to check if the error is an instance of NodeJS.ErrnoException.
 * @param error - The error to check.
 * @returns True if the error is an ErrnoException, false otherwise.
 */
export function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (error as NodeJS.ErrnoException).code !== undefined;
}
