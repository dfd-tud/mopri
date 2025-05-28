// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  SupportedCapability,
  SupportedRunTarget,
  PlatformApiOptions,
  PlatformApi,
  platformApi,
} from "appstraction";
import { ILogger } from "../logger/ILogger.js";
import { logExecaError } from "../utils.js";
import { runAndroidDevTool } from "andromatic";
import fs from "fs/promises";

type AndroidApiExtension = {
  /**
   * Stop and remove frida-server binary from mobile Android device
   * Only fires when capabilities include "frida"
   *
   * @returns A Boolean the operation was successfull.
   */
  uninstallFrida: () => Promise<Boolean>;

  /**
   * Retrieve version of Frida installed on the phone.
   *
   * @returns A string containing the version output.
   */
  getFridaVersion: () => Promise<string>;

  /**
   * Allow a vpn application to utalize the vpn interface of Android without the user having to allow.
   */
  activateVPN: (vpnPackageName: string) => Promise<void>;

  /**
   * Wrapper to pull data of the device to a certain location on the server
   */
  pull: (onDevicePath: string, destinationPath: string) => Promise<void>;

  /**
   * Wrapper to catch uninstall errors and log them accordingly
   */
  uninstallAppWithLogging(
    appPackageName: string,
    moduleName: string,
  ): Promise<boolean>;

  /**
   * Retrieve the AdId from the phone.
   */
  getAdId: () => Promise<string | undefined>;
  getIMEI: () => Promise<string | undefined>;

  writeTextToFile(
    content: string,
    remoteFilePath: string,
    fileOwner?: string,
    fileMode?: string,
  ): Promise<void>;
};

export type ExtendedAndroidApi<
  RunTarget extends SupportedRunTarget<"android">,
  Capabilities extends SupportedCapability<"android">[],
  Capability = Capabilities[number],
> = PlatformApi<"android", RunTarget, Capabilities, Capability> &
  AndroidApiExtension;

/**
 * Extends the androidApi of appstraction with further functions like uninstallFrida()
 *   @returns ExtendedAndroidApi extends PlatformApi
 */
export const extendedAndroidApi = <
  RunTarget extends SupportedRunTarget<"android">,
>(
  options: PlatformApiOptions<
    "android",
    RunTarget,
    SupportedCapability<"android">[]
  >,
  logger: ILogger,
): ExtendedAndroidApi<
  "device" | "emulator",
  SupportedCapability<"android">[]
> => ({
  ...platformApi(options),
  async uninstallFrida() {
    if (!options.capabilities.includes("frida")) return true;
    let success = true;
    try {
      const { adbRootShell } = await this._internal.requireRoot("Stop frida");
      // kill frida-server process
      try {
        await adbRootShell(["killall", "-9", "frida-server"]);
      } catch (err) {
        // handle kill error
        logExecaError(
          err,
          "Failed to kill frida-server process",
          "ExtendedAndroidApi",
          logger,
        );
        success = false;
      }
      // uninstall frida
      try {
        // delete frida-server binary
        await adbRootShell(["rm", "/data/local/tmp/frida-server"]);
      } catch (err) {
        // handle remove error
        logExecaError(
          err,
          "Failed to remove frida-server binary",
          "ExtendedAndroidApi",
          logger,
        );
        success = false;
      }
    } catch (err) {
      // handle adb root shell error
      logExecaError(
        err,
        "Failed to stop & remove frida-server",
        "ExtendedAndroidApi",
        logger,
      );
      success = false;
    }
    return success;
  },
  async getFridaVersion() {
    const { stdout: versionCode } = await runAndroidDevTool("adb", [
      "shell",
      "/data/local/tmp/frida-server",
      "--version",
    ]);
    return versionCode;
  },
  async activateVPN(vpnPackageName) {
    runAndroidDevTool("adb", [
      "shell",
      "cmd",
      "appops",
      "set",
      vpnPackageName,
      "ACTIVATE_VPN",
      "allow",
    ]);
  },
  async pull(onDevicePath: string, destinationPath: string) {
    runAndroidDevTool("adb", ["pull", onDevicePath, destinationPath]);
  },
  async uninstallAppWithLogging(appPackageName: string, moduleName: string) {
    try {
      await this.uninstallApp(appPackageName);
      logger.log(moduleName, `Uninstalled ${appPackageName}`, "log");
      return true;
    } catch (error) {
      // handle error
      logger.error(moduleName, `Failed to uninstall ${appPackageName}`);
      return true;
    }
  },
  /**
   * Retrieves the advertising ID (Ad ID) from the device's Google Play Services settings.
   * This function requires root access to read the adid_settings.xml file.
   *
   * @returns {Promise<string | undefined>} A promise that resolves to the Ad ID as a string, or undefined if not found.
   * @throws {Error} If there is an error reading the adid_settings.xml file.
   */
  async getAdId(): Promise<string | undefined> {
    const { adbRootShell } = await this._internal.requireRoot("Retrieve ad id");
    // this works only on devices with google play services
    const { stdout: adidSettingsXML, stderr } = await adbRootShell([
      "cat",
      "/data/data/com.google.android.gms/shared_prefs/adid_settings.xml",
    ]);
    if (stderr) {
      throw Error("Failed to read adid_settings file: " + stderr);
    }
    // Use a regular expression to find the adid_key value
    const match = adidSettingsXML.match(
      /<string name="adid_key">([^<]*)<\/string>/,
    );
    return match?.[1];
  },
  async getIMEI(): Promise<string | undefined> {
    const { adbRootShell } = await this._internal.requireRoot("Retrieve ad id");
    /**
     * The following code retrieves the device's IMEI number by translating a shell command
     * originally found on Stack Overflow. The command uses ADB to call the `iphonesubinfo` service
     * and processes the output using various text manipulation tools (awk, sed, tr) to extract the IMEI.
     * Original command: adb shell service call iphonesubinfo 1 | awk -F "'" '{print $2}' | sed '1 d' | tr -d '.' | awk '{print}' ORS=
     * Source: https://stackoverflow.com/questions/6852106/is-there-an-android-shell-or-adb-command-that-i-could-use-to-get-a-devices-imei
     **/
    // Step 1: Call the service to get device info
    const { stdout: deviceInfo } = await adbRootShell([
      "service",
      "call",
      "iphonesubinfo",
      "1",
    ]);
    // Step 2: Extract the second field using a regex instead of awk
    const imeiMatch = deviceInfo.match(/'([^']+)'/);
    if (!imeiMatch || !imeiMatch[1]) {
      throw new Error("IMEI not found in device info.");
    }
    let imei = imeiMatch[1]; // This is the IMEI number

    // Step 3: Remove the first line (if necessary)
    const lines = imei.split("\n");
    if (lines.length > 1) {
      lines.shift(); // Remove the first line
      imei = lines.join("\n"); // Join the remaining lines
    }

    // Step 4: Remove periods from the IMEI and trim whitespaces
    imei = imei.replace(/\./g, "").trim();

    // Step 5: Return the final IMEI
    return imei.trim() || undefined; // Trim any extra whitespace
  },

  async writeTextToFile(content, remoteFilePath, fileOwner?, fileMode?) {
    const { adbRootPush, adbRootShell } =
      await this._internal.requireRoot("Write text file");
    const tempFilePath = "tmpfile.txt";
    try {
      await fs.writeFile(tempFilePath, content, "utf8");
      await adbRootPush(tempFilePath, remoteFilePath);
      if (fileOwner) {
        await adbRootShell([
          "chown",
          `${fileOwner}:${fileOwner}`,
          remoteFilePath,
        ]);
      }
      if (fileMode) {
        await adbRootShell(["chmod", "660", remoteFilePath]);
      }
    } catch (error) {
      console.error("Error writing text file:", error);
    } finally {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
  },
});
