// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { RecordingResultTypes } from "@mopri/schema";
import { runAndroidDevTool } from "andromatic";
import { SupportedCapability, SupportedRunTarget } from "appstraction";
import { IResultStorageHelper } from "../../../../helpers/ResultStorageHelper.js";
import { ExtendedAndroidApi } from "../../../../helpers/ExtendedAndroidApi.js";
import IDynamicCollector from "./IDynamicCollector.js";
import { ILogger } from "../../../../logger/ILogger.js";
import { PCAPdroidDownloader } from "./PCAPdroidDownloader.js";
import {
  PCAPdroidConfig,
  PCAPdroidConfigGenerator,
} from "modules/DynamicAnalysis/collectors/dynamic/PCAPdroidConfigGenerator.js";

// subset taken from https://github.com/emanuele-f/PCAPdroid/blob/master/docs/app_api.md
interface CaptureSettings {
  pcap_dump_mode?: "none" | "http_server" | "udp_exporter" | "pcap_file";
  app_filter?: string;
  pcap_name?: string;
}

export default class PCAPdroidManager implements IDynamicCollector {
  public name = PCAPdroidManager.name;
  public pcapDroidPackageName = "com.emanuelef.remote_capture";
  private acticityName = this.pcapDroidPackageName + "/.activities.CaptureCtrl";
  private onDevicePCAPFileName: string;
  public outputFile = "traffic.pcap";
  public state: "init" | "setup" | "running" | "stoped" | "cleaned" = "init";

  // todo: take start activity arguments
  constructor(
    public packageNameToCapture: string,
    public platformApi: ExtendedAndroidApi<
      SupportedRunTarget<"android">,
      SupportedCapability<"android">[]
    >,
    private pcapDroidDownloader: PCAPdroidDownloader,
    private storageHelper: IResultStorageHelper,
    public logger: ILogger,
  ) {
    this.onDevicePCAPFileName = `${Date.now()}_${packageNameToCapture}.pcap`;
  }

  async setup() {
    this.logger.log(
      this.name,
      "Retrieving PCAPdroid (downloading if necessary)",
      "start",
    );
    const pcapDroidApkPath = await this.pcapDroidDownloader.retrieveApk();
    this.logger.log(
      this.name,
      "Retrieved PCAPdroid: " + pcapDroidApkPath,
      "stop",
    );
    if (!(await this.platformApi.isAppInstalled(this.pcapDroidPackageName))) {
      await this.platformApi.installApp(pcapDroidApkPath as `${string}.apk`);
      // todo: exception handling when app is not installed
      this.logger.log(this.name, "PCAPDroid installed", "log");
    }
    this.logger.log(this.name, "Setting permissions for PCAPDroid");
    await this.platformApi.setAppPermissions(this.pcapDroidPackageName, {
      "android.permission.POST_NOTIFICATIONS": "allow",
    });

    // activate vpn
    await this.platformApi.activateVPN(this.pcapDroidPackageName);

    // set pcap config to avoid onboarding screen and have correct settings
    // todo: automatically set appver depending on the apk version 
    const defaultConfig: PCAPdroidConfig = {
      ip_mode: "both",
      start_at_boot: false,
      app_language: "system",
      capture_interface: "@inet",
      pcapng_format: true,
      block_quic_mode: "never",
      appver: 84,
      tls_decryption: false,
      pcapdroid_trailer: false,
      restart_on_disconnect: false,
      full_payload: false,
      firewall_wl_init: 1,
      app_theme: "system",
      license: "",
      http_server_port: "8080",
      collector_port: "1234",
      auto_block_private_dns: true,
      root_capture: false,
      pcap_dump_mode_v2: "none",
      collector_ip_address: "127.0.0.1",
      malware_detection: false,
    };
    const configGen = new PCAPdroidConfigGenerator(defaultConfig);
    const xmlConf = configGen.toXML();
    const onDeviceConfigPath =
      "/data/data/com.emanuelef.remote_capture/shared_prefs/com.emanuelef.remote_capture_preferences.xml";
    try {
      const { adbRootShell } = await this.platformApi._internal.requireRoot(
        "Update PCAPdroid settings",
      );
      // get app user that needs to be set as configFile owner for the app to access the file
      const { stdout: appUser } = await adbRootShell([
        "stat",
        "-c",
        "%U",
        "/data/data/com.emanuelef.remote_capture",
      ]);
      await this.platformApi.writeTextToFile(xmlConf, onDeviceConfigPath, appUser, '660');
    } catch (error) {
      console.error(error);
      this.logger.error(this.name, "Failed to update pcapDroid settings");
    }
    this.state = "setup";
  }

  async startCollection(autoGrant: boolean = true) {
    if (this.state != "setup") {
      throw new Error(
        "You need to call setup() before being able to startCollection()",
      );
    }
    await this.platformApi.startApp(this.pcapDroidPackageName);
    await this.invokeActicity("start", autoGrant, {
      pcap_dump_mode: "pcap_file",
      pcap_name: this.onDevicePCAPFileName,
      app_filter: this.packageNameToCapture,
    });
    this.state = "running";
  }

  async stopCollection(autoGrant: boolean = true) {
    await this.invokeActicity("stop", autoGrant);
    this.logger.log(this.name, "Stopped PCAPDroid recording");

    // retrieve recorded pcap file from device to result storage
    const pcapResultStoragePath = this.storageHelper.getStorageFilePath(
      this.outputFile,
      "collection",
    );
    const pcapOnDevicePath = `/sdcard/Download/PCAPdroid/${this.onDevicePCAPFileName}`;
    try {
      await this.platformApi.pull(pcapOnDevicePath, pcapResultStoragePath);
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.NetworkPCAP,
        "dynamic",
        this.outputFile,
      );
      this.logger.log(
        this.name,
        "Downloaded recorded pcap from analysis device",
      );
    } catch (error) {
      this.logger.error(
        this.name,
        "Failed to retrieve pcap file from device: " + error,
      );
      // todo: store error instead
    }
    this.state = "stoped";
  }

  async cleanup() {
    const success = await this.platformApi.uninstallAppWithLogging(
      this.pcapDroidPackageName,
      this.name,
    );
    if (success) {
      this.state = "cleaned";
    }
  }

  private buildCaptureSettingsList(settings: CaptureSettings): string[] {
    const entries: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        // Check if the value is defined
        entries.push("-e", key, String(value)); // Convert value to string
      }
    }

    return entries;
  }

  /**
   * Retrieves the coordinates of the "ALLOW" button from the given XML string.
   *
   * This method uses a regular expression to search for a node in the XML that contains
   * the text "ALLOW" and extracts its bounding box coordinates. If the button is found,
   * it returns an object containing the top-left (x1, y1) and bottom-right (x2, y2)
   * coordinates of the button. If the button is not found, it returns null.
   *
   * @param xmlString - The XML string to search for the "ALLOW" button.
   * @returns An object with the coordinates { x1, y1, x2, y2 } if the button is found,
   *          or null if it is not found.
   */
  private getAllowButtonCoordinates(
    xmlString: string,
  ): { x1: number; y1: number; x2: number; y2: number } | null {
    // Regular expression to find the ALLOW button node and its bounds
    const allowButtonRegex =
      /<node[^>]*text="ALLOW"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;

    const match = xmlString.match(allowButtonRegex);

    if (
      match &&
      match.length === 5 &&
      match[1] &&
      match[2] &&
      match[3] &&
      match[4]
    ) {
      const x1 = parseInt(match[1], 10);
      const y1 = parseInt(match[2], 10);
      const x2 = parseInt(match[3], 10);
      const y2 = parseInt(match[4], 10);
      return { x1, y1, x2, y2 };
    }

    // Return null if the button is not found
    return null;
  }

  /**
   * Waits for the PCAPdroid control request window to appear.
   *
   * @param {number} maxRetries - The maximum number of retries to check for the control request.
   * @throws {Error} Throws an error if the control request window is not found within the maximum retries.
   */
  private async waitForControlRequestWindow(maxRetries: number = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // get XML dump of current UI hierarchy on the analysis device
      const { stdout: xmlDomString } = await runAndroidDevTool("adb", [
        "exec-out",
        "uiautomator",
        "dump",
        "/dev/tty",
      ]);

      const controlRequestModalHeading = "PCAPdroid control request";
      if (xmlDomString.includes(controlRequestModalHeading)) {
        return xmlDomString; // Exit if the control request modal was found on screen
      }
    }
    throw new Error(
      "Max retries reached: 'PCAPdroid control request' window not found.",
    );
  }

  /**
   * Automatically allows the PCAPdroid control request by simulating key events.
   *
   * @returns {Promise<void>} A promise that resolves when the control request has been allowed.
   * @throws {Error} Throws an error if the control request window is not found before attempting to grant permissions.
   */
  private async autoAllowControlRequest(): Promise<void> {
    const xmlDomString = await this.waitForControlRequestWindow();
    const allowButtonCoordinates = this.getAllowButtonCoordinates(xmlDomString);
    // grant PCAPdroid control request by pressing allow
    if (allowButtonCoordinates) {
      // find coordinates of middle point of the button to press
      const x = (allowButtonCoordinates.x1 + allowButtonCoordinates.x2) / 2;
      const y = (allowButtonCoordinates.y1 + allowButtonCoordinates.y2) / 2;
      console.log(`Found "ALLOW" button coordinates: (x: ${x}, y: ${y})`);
      // tab onto coordinates
      await runAndroidDevTool("adb", [
        "shell",
        "input",
        "tap",
        x.toString(),
        y.toString(),
      ]);
    } else {
      // fall back if coordinates could not be found
      // tab to focus alert window (selects "DENY" button)
      await runAndroidDevTool("adb", ["shell", "input", "keyevent", "61"]);
      // tab to select "ALLOW" button
      await runAndroidDevTool("adb", ["shell", "input", "keyevent", "61"]);
      // enter to press "ALLOW" button
      await runAndroidDevTool("adb", ["shell", "input", "keyevent", "66"]);
    }
  }

  /**
   * Invokes the pcapDroid capture activity on an Android device using ADB (Android Debug Bridge).
   * This function utilizes PCAPdroid API. For more details, refer to the
   * [PCAPdroid API documentation](https://github.com/emanuele-f/PCAPdroid/blob/master/docs/app_api.md).
   *
   * @param {("start" | "stop" | "get_status")} action - The action to perform on the activity.
   *   - "start": Starts the activity.
   *   - "stop": Stops the activity.
   *   - "get_status": Retrieves the status of the activity.
   * @param {boolean} autoGrant - A flag indicating whether to automatically allow PCAPdroid control request.
   * @param {CaptureSettings} [captureSettings] - Optional settings for capturing data.
   *   If provided, these settings will be included in the ADB command.
   *
   * @returns {Promise<void>} A promise that resolves when the activity has been invoked.
   */
  private async invokeActicity(
    action: "start" | "stop" | "get_status",
    autoGrant: boolean,
    captureSettings?: CaptureSettings,
  ): Promise<void> {
    await runAndroidDevTool("adb", [
      "shell",
      "am",
      "start",
      "-e",
      "action",
      action,
      ...(captureSettings
        ? this.buildCaptureSettingsList(captureSettings)
        : []),
      "-n",
      this.acticityName,
    ]);
    if (autoGrant) {
      await this.autoAllowControlRequest();
    }
  }
}
