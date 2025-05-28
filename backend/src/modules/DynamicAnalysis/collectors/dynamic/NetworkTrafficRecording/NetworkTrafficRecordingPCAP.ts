// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import INetworkTrafficCollector from "./INetworkTrafficCollector.js";
import { ILogger } from "../../../../../logger/ILogger.js";
import {
  ApkHelper,
  IResultStorageHelper,
} from "../../../../../helpers/index.js";
import {
  ExtendedAndroidApi,
  extendedAndroidApi,
} from "../../../../../helpers/ExtendedAndroidApi.js";
import PCAPdroidManager from "../PCAPdroidManager.js";
import FriTapManager from "../FriTapManager.js";

import Android from "@wtto00/android-tools";
import { VenvOptions, getVenv } from "autopy";
import {
  decompressGzipFromBase64,
  getConnectedDeviceId,
  logExecaError,
  parseURLSearchParams,
} from "../../../../../utils.js";
import { execa } from "execa";

import type { Har, PostData } from "har-format";
import { PCAPngUtilsRequest } from "../../../../../types/Har.js";
import { SupportedRunTarget, SupportedCapability } from "appstraction";
import { DeviceType, RecordingResultTypes } from "@mopri/schema";
import { PCAPdroidDownloader } from "modules/DynamicAnalysis/collectors/dynamic/PCAPdroidDownloader.js";

const PcapToHarVenvSettings: VenvOptions = {
  name: "mopri",
  pythonVersion: "~3.11", // Use any Python 3.11.x version.
  requirements: [{ name: "pcapng-utils", version: "==1.0.5" }],
};

export class NetworkTrafficRecordingPCAP implements INetworkTrafficCollector {
  name = NetworkTrafficRecordingPCAP.name;
  private deviceId?: string;
  private testAppApkHelper: ApkHelper;
  private platformApi: ExtendedAndroidApi<
    SupportedRunTarget<"android">,
    SupportedCapability<"android">[]
  >;
  private pcapDroidManager?: PCAPdroidManager;
  private friTapManager?: FriTapManager;
  private state: "init" | "setup" | "running" | "stoped" | "cleaned" = "init";

  constructor(
    private appPackageStorageId: string,
    private deviceType: DeviceType,
    private analysisStrategy: "meta-only" | "friTap",
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
  ) {
    this.platformApi = extendedAndroidApi(
      {
        platform: "android",
        // our deviceType "physical" is named "device" in library appstraction
        runTarget: this.deviceType == "physical" ? "device" : "emulator",
        // frida is only needed when friTap is used
        capabilities:
          analysisStrategy === "friTap" ? ["frida", "root"] : ["root"],
      },
      this.logger,
    );
    this.testAppApkHelper = new ApkHelper(this.appPackageStorageId);
  }

  public async setup() {
    const testAppPackageName = (await this.testAppApkHelper.getAppPackageInfo())
      .package;

    // get adb id of the connected device
    this.deviceId = await getConnectedDeviceId();
    if (!this.deviceId) throw new Error("Could not find device");
    await new Android().ensureReady(this.deviceId);
    this.logger.log(this.name, `Device ${this.deviceId} ready.`, "log");

    if (this.analysisStrategy == "friTap") {
      this.friTapManager = new FriTapManager(
        testAppPackageName,
        this.platformApi,
        this.storageHelper,
        this.logger,
      );
      this.friTapManager.setup();
    }

    // todo: let this be handled by a di container and read version from config
    const pcapDroidDownloader = new PCAPdroidDownloader('v1.8.4');

    this.pcapDroidManager = new PCAPdroidManager(
      testAppPackageName,
      this.platformApi,
      pcapDroidDownloader,
      this.storageHelper,
      this.logger,
    );
    await this.pcapDroidManager?.setup();

    const packageFilePath = await this.testAppApkHelper.getPackageFilePath();
    await this.platformApi.installApp(packageFilePath);

    const isTestAppInstalled = await new Android().isInstalled(
      this.deviceId,
      testAppPackageName,
    );
    if (!isTestAppInstalled) {
      throw new Error("Test app installation failed");
    }
    this.logger.log(
      this.name,
      `Test app ${testAppPackageName} installed`,
      "log",
    );

    this.state = "setup";
  }

  public async startCollection(): Promise<void> {
    if (this.state != "setup") {
      throw new Error(
        "You need to call setup() before being able to startCollection()",
      );
    }
    const testAppPackageName = (await this.testAppApkHelper.getAppPackageInfo())
      .package;

    try {
      this.logger.log(this.name, "Start pcap recording", "start");
      await this.pcapDroidManager?.startCollection();

      if (this.friTapManager) {
        // start fritap -> also starts the app
        this.logger.log(this.name, "Starting friTap...", "log");
        try {
          const startTime = new Date().getTime(); // Get the current time in milliseconds
          await this.friTapManager.startCollection();
          const endTime = new Date().getTime(); // Get the end time
          const elapsedTime = endTime - startTime; // Calculate elapsed time in milliseconds
          console.log(`Time it took to start FriTap: ${elapsedTime} ms`);
        } catch (error) {
          console.error(error);
          this.logger.error(this.name, "Failed to run FriTap: " + error);
          throw error;
        }
        this.logger.log(this.name, "FriTap started", "start");
      } else {
        // if friTap is not selected / not available -> start app
        try {
          await this.platformApi.startApp(testAppPackageName);
        } catch (err) {
          logExecaError(
            err,
            "Failed to start app, try starting it manually",
            this.name,
            this.logger,
          );
        }
      }
      this.logger.log(this.name, "Collection started", "log");
    } catch (error) {
      console.error(error);
      throw new Error("Failed to start collection", { cause: error });
    }
    this.state = "running";
  }

  async stopCollection(): Promise<void> {
    const testAppPackageName = (await this.testAppApkHelper.getAppPackageInfo())
      .package;

    // stop app
    try {
      await this.platformApi.stopApp(testAppPackageName);
    } catch (err) {
      // handle error
    }

    // stop FriTap
    await this.friTapManager?.stopCollection();
    // stop PCAPDroid
    await this.pcapDroidManager?.stopCollection();

    this.state = "stoped";
  }

  async cleanup() {
    this.logger.log(this.name, "cleanupDevice", "start");
    // delete files
    //
    // uninstall tested app
    const testAppPackageName = (await this.testAppApkHelper.getAppPackageInfo())
      .package;
    const uninstallSuccess = await this.platformApi.uninstallAppWithLogging(
      testAppPackageName,
      this.name,
    );

    //remove PCAPdroid
    await this.pcapDroidManager?.cleanup();

    // remove Frida from the device
    await this.friTapManager?.cleanup();

    this.state = "cleaned";
  }

  async postProcess() {
    this.logger.log(this.name, "Started to convert pcap to har", "start");
    const pcapFile = this.storageHelper.getRegisteredResult(
      "collection",
      RecordingResultTypes.NetworkPCAP,
    )?.file;
    if (!pcapFile)
      throw Error("Could not post process - pcapFile registration is missing.");
    const pcapFilePath = this.storageHelper.getStorageFilePath(
      pcapFile,
      "collection",
    );
    const pcapngFile = "traffic.pcapng";
    const pcapngFilePath = this.storageHelper.getStorageFilePath(
      pcapngFile,
      "collection",
    );
    try {
      // Construct the command to run tshark
      const command = "editcap";
      const args = [
        pcapFilePath, // Input PCAP file
        pcapngFilePath, // Output pcapng file
      ];

      const keylogFile = this.storageHelper.getRegisteredResult(
        "collection",
        RecordingResultTypes.NetworkTLSKeyLog,
      )?.file;
      // in case a key log was recorded, inject secrets
      if (keylogFile) {
        const keylogFilePath = this.storageHelper.getStorageFilePath(
          keylogFile,
          "collection",
        );
        args.unshift(
          "--inject-secrets",
          `tls,${keylogFilePath}`, // Keylog file option
        );
      }else{
        this.logger.log(this.name, "No encryption keys were recorded. Continuing processing without decryption.");
      }

      // Execute the command
      const { stdout, stderr } = await execa(command, args);
      this.logger.log(this.name, `Successfully created ${pcapngFile}`);
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.NetworkPCAPng,
        "dynamic",
        pcapngFile,
      );
    } catch (error) {
      throw Error("Error injecting secrets into pcap:", { cause: error });
    }
    this.logger.log(this.name, "Convert pcapng to har");
    // convert to har
    const harFile = "traffic.har";
    const harFilePath = this.storageHelper.getStorageFilePath(
      harFile,
      "collection",
    );
    const python = await getVenv(PcapToHarVenvSettings);
    try {
      const { stdout, stderr } = await python("pcapng_to_har", [
        "-i",
        pcapngFilePath,
        "-o",
        harFilePath,
        "-f",
      ]);
      console.log(stdout);
      this.logger.log(this.name, `Successfully created ${harFile}`);
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.NetworkHar,
        "dynamic",
        harFile,
      );
    } catch (error) {
      console.error(error);
      throw Error("Failed to convert pcapng to har.", { cause: error });
    }
    // improve har file
    try {
      this.logger.log(this.name, "Improving har file.", "start");
      await this.improveHarFile(harFile);
      this.logger.log(this.name, "Successfully improved har file.", "stop");
    } catch (error) {
      this.logger.error(this.name, "Failed to improve har file");
      console.error(error);
    }
  }

  /**
   * Improves a HAR (HTTP Archive) file by processing its entries.
   * This function reads a HAR file, processes each entry to enhance its request data,
   * and saves the modified HAR back to a file.
   *
   * @param harFilename - The name of the HAR file to be improved. This should include the file extension.
   *
   * @remarks
   * The function performs the following operations on each entry:
   * - If the request does not have postData but has content, it attempts to decode the content from base64.
   * - It populates the `queryString` property with search parameters extracted from the request URL if it is empty.
   * - If the request's postData is of type `application/x-www-form-urlencoded`, it translates the raw text into parameters.
   * - It attempts to decode any base64-encoded and gzip-compressed values in the parameters.
   *
   * Note: This function assumes that the input HAR file is well-formed and follows the HAR specification.
   * Any malformed entries may lead to unexpected behavior or errors.
   */
  private async improveHarFile(harFilename: string) {
    const har: Har = await this.storageHelper.readResultFromJsonFile(
      harFilename,
      "collection",
    );
    const entries = har.log.entries;
    har.log.entries = await Promise.all(
      entries.map(async (entry) => {
        const request = entry.request as PCAPngUtilsRequest;
        // copy binary data to
        // this is outside of the standard added by pcapng-utils - see: https://github.com/PiRogueToolSuite/pcapng-utils/blob/main/pcapng_utils/payload.py#L61
        if (!request.postData && request._content) {
          const pcapng_utils_content = request._content;
          if (pcapng_utils_content.encoding == "base64") {
            request.postData = {
              mimeType: pcapng_utils_content.mimeType,
              text: atob(pcapng_utils_content.text),
            };
          }
        }

        // populate queryString property with the search parameters
        const urlObj = new URL(request.url);
        if (request.queryString.length == 0 && urlObj.search) {
          request.queryString = parseURLSearchParams(urlObj.search);
        }

        // post process postData
        if (
          request.postData &&
          request.postData.mimeType.includes("x-www-form-urlencoded")
        ) {
          // translate raw text to params if applicable (text and params are mutual exclusive)
          if (request.postData.text) {
            const newPostData: PostData = {
              params: parseURLSearchParams(request.postData.text),
              mimeType: request.postData.mimeType,
            };
            request.postData = newPostData;
          }
          // decode base64 and gziped strings in the form-urlencoded data
          if (request.postData.params) {
            // try to decode gzip compressed base64 strings
            request.postData.params = await Promise.all(
              request.postData.params.map(async (param) => {
                // try json decode the values in params
                if (param.value) {
                  try {
                    const value = await decompressGzipFromBase64(param.value);
                    param.value = value;
                  } catch {}
                }
                return param;
                // try base64 decoding values
              }),
            );
          }
        }
        return entry;
      }),
    );
    const name = harFilename.split(".")[0];
    if (name) {
      await this.storageHelper.saveResultToJsonFile(
        har,
        name,
        "har",
        "collection",
      );
    }
  }
}
