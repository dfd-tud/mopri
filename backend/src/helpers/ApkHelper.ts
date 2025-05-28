// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import NodeApk, { Manifest, Resources } from "node-apk";
import path from "path";
import os from "os";
import fsPromise from "node:fs/promises";
import fs from "node:fs";
import { createHash } from "crypto";
import { pipeline } from "stream/promises";

import StreamZip from "node-stream-zip";
import {
  AppPackageHashes,
  AppPackageInfo,
  AppPackageType,
} from "@mopri/schema";
import {
  FileNotFoundError,
  UploadedAppPackageAlreadyExists,
} from "../types/Errors.js";
import { Transform, TransformCallback } from "stream";
import { ensureDirectoryExists } from "../utils.js";

const APP_PACKAGE_UPLOAD_DIR = path.join(
  path.resolve(),
  "/storage/uploads/apk",
);
const APP_PACKAGE_INFO_FILENAME = "appPackageMeta.json";

export class ApkHelper {
  public appPackageDirPath: string;
  private tmpBaseApkPath?: string;
  private appPackageInfo?: AppPackageInfo;
  constructor(public storageId: string) {
    this.appPackageDirPath = path.join(APP_PACKAGE_UPLOAD_DIR, storageId);
  }

  /**
   * Constructs the file path for the application package based on the package information stored in the directory.
   * Either returns the path to .apk or .xapk archive based on the type specified in the package information.
   *
   * @returns {Promise<`${string}.${AppPackageType}`} A promise that resolves to the file path of the application package.
   *
   * @throws {Error} Throws an error if the application package information cannot be
   * retrieved.
   */
  async getPackageFilePath(): Promise<`${string}.${AppPackageType}`> {
    const appPackageInfo: AppPackageInfo = await this.getAppPackageInfo();
    const appPackageFileName = `${appPackageInfo.package}.${appPackageInfo.type}`;
    return path.join(
      this.appPackageDirPath,
      appPackageFileName,
    ) as `${string}.${AppPackageType}`;
  }

  /**
   * Retrieves the base APK file path based on the application package information.
   * This method checks the type of the application package (APK or XAPK) and constructs
   * the appropriate file path accordingly. If the package type is APK, it returns the
   * path to the APK file. If the package type is XAPK, it extracts the base APK from
   * the XAPK archive and returns the temporary path to the extracted APK.
   *
   * @returns {Promise<string>} A promise that resolves to the file path of the base APK.
   *
   * @throws {Error} Throws an error if the application package information cannot be
   * retrieved or if there are issues accessing the APK or XAPK files.
   */
  async getBaseApkPath(): Promise<string> {
    const appPackageInfo: AppPackageInfo = await this.getAppPackageInfo();
    if (appPackageInfo.type == "apk") {
      return path.join(this.appPackageDirPath, appPackageInfo.package + ".apk");
    } else {
      this.tmpBaseApkPath = await ApkHelper.tmpExtractBaseApkFromXapk(
        path.join(this.appPackageDirPath, appPackageInfo.package + ".xapk"),
      );
      return this.tmpBaseApkPath;
    }
  }
  /**
   * Retrieves the content of the APP_PACKAGE_INFO_FILENAME.json from the APK directory.
   * This method loads the information from the file on the first access and caches it
   * in the class property for subsequent retrievals, improving performance by avoiding
   * repeated file reads.
   *
   * @returns {Promise<AppPackageInfo>} A promise that resolves to an instance of
   * AppPackageInfo containing the application package information.
   *
   * @throws {Error} Throws an error if the json file cannot be accessed or if the
   * package information cannot be retrieved.
   */
  async getAppPackageInfo(): Promise<AppPackageInfo> {
    if (!this.appPackageInfo) {
      this.appPackageInfo = await ApkHelper.getAppPackageInfo(this.storageId);
    }
    return this.appPackageInfo;
  }

  /**
   * Removes tmp base apk if it was extracted.
   * Please execute when your done with this class and used getBaseApkPath to avoid unused tmp files
   */
  async close() {
    if (this.tmpBaseApkPath) {
      try {
        await fsPromise.unlink(this.tmpBaseApkPath);
      } catch (error) {
        console.error("Failed to remove tmp base apk", error);
      }
    }
  }

  // check if package exists in apk upload dir
  async isPackageFilePresent(): Promise<boolean> {
    const appPackageList = await ApkHelper.getStorageIds();
    return appPackageList.some((appPackage) => appPackage == this.storageId);
  }

  // removes an apk from the uploads folder
  async delete() {
    fsPromise.rmdir(this.appPackageDirPath);
  }

  static async tmpExtractBaseApkFromXapk(pathToXapk: string): Promise<string> {
    const zip = new StreamZip.async({ file: pathToXapk });
    const xapkManifest = JSON.parse(
      (await zip.entryData("manifest.json")).toString(),
    );
    const baseAPKFilename = xapkManifest.package_name + ".apk";
    // extract base apk to temporay file to be able to read it as a manifest
    const tmpBaseAPKFilePath = path.join(os.tmpdir(), baseAPKFilename);
    await zip.extract(baseAPKFilename, tmpBaseAPKFilePath);
    await zip.close();
    return tmpBaseAPKFilePath;
  }

  // copys a newly uploaded apk from tmp to the uploads dir with a fixed naming based on the manifestinfo
  static async storeApk(uploadedPackageTmpPath: string): Promise<string> {
    var baseAPKPath: string;
    var type: AppPackageType;
    if (uploadedPackageTmpPath.endsWith(".xapk")) {
      type = "xapk";
      baseAPKPath = await ApkHelper.tmpExtractBaseApkFromXapk(
        uploadedPackageTmpPath,
      );
    } else if (uploadedPackageTmpPath.endsWith(".apk")) {
      type = "apk";
      baseAPKPath = uploadedPackageTmpPath;
    } else {
      throw new Error("Package type not known");
    }

    const apk = new NodeApk.Apk(baseAPKPath);
    const manifest: Manifest = await apk.getManifestInfo();
    const resources: Resources = await apk.getResources();
    apk.close();

    const packageName = manifest.package;
    const storageId = `${packageName}_${manifest.versionName}`;
    const newAppPackageDirPath = path.join(APP_PACKAGE_UPLOAD_DIR, storageId);
    const newFileName = packageName + path.extname(uploadedPackageTmpPath);
    const newFilePath = path.join(newAppPackageDirPath, newFileName);

    // build resulting appPackageInfo
    const appPackageInfo: AppPackageInfo = {
      storageId,
      label: fetchAppLabel(manifest, resources),
      package: manifest.package,
      version: manifest.versionName,
      hashes: await generateHashes(uploadedPackageTmpPath),
      type,
      uploadTime: Date.now(),
    };

    console.log(appPackageInfo);

    try {
      // recursive to ensure that apk uploads folder is also created on first app upload
      await fsPromise.mkdir(newAppPackageDirPath, { recursive: true });

      // save appPackageInfo to json file
      await fsPromise.writeFile(
        path.join(newAppPackageDirPath, APP_PACKAGE_INFO_FILENAME),
        JSON.stringify(appPackageInfo),
      );
      // move temporary package file (apk | xapk) to newly created folder
      // cannot use rename since the files might be on different partitions
      await fsPromise.cp(uploadedPackageTmpPath, newFilePath);
      await fsPromise.unlink(uploadedPackageTmpPath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code == "EEXIST") {
        throw new UploadedAppPackageAlreadyExists();
      } else {
        throw error;
      }
    } finally {
      if (type == "xapk") {
        try {
          await fsPromise.unlink(baseAPKPath);
        } catch (error) {
          console.error(`Failed to remove ${baseAPKPath}`, error);
        }
      }
    }
    return storageId;
  }

  // returns a list of all filenames in apk upload dir
  static getStorageIds(): Promise<string[]> {
    return fsPromise.readdir(APP_PACKAGE_UPLOAD_DIR);
  }

  // returns the appPackageInfo for a specifc appPackage
  static async getAppPackageInfo(storageId: string): Promise<AppPackageInfo> {
    const appPackageInfoPath = path.join(
      APP_PACKAGE_UPLOAD_DIR,
      storageId,
      APP_PACKAGE_INFO_FILENAME,
    );
    try {
      const data = await fsPromise.readFile(appPackageInfoPath, {
        encoding: "utf8",
      });
      const appPackageInfo: AppPackageInfo = JSON.parse(data);
      return appPackageInfo;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new FileNotFoundError(
          `AppPackageInfo not found: ${appPackageInfoPath}`,
        );
      } else {
        throw error;
      }
    }
  }

  // returns a list of all uploaded appPackages and the corresponding info
  static async getUploadedAppPackages(): Promise<AppPackageInfo[]> {
    const fileList = await ApkHelper.getStorageIds();
    // get manifest infos for all apks and await them properly
    // (without await Promise.all() a list of promises is returned)
    return Promise.all(
      fileList.map(async (storageId): Promise<AppPackageInfo | null> => {
        try {
          return this.getAppPackageInfo(storageId);
        } catch (error) {
          console.error(
            `Failed to get app package info for storageId ${storageId}:`,
            error,
          );
          return null;
        }
      }),
    ).then((results): AppPackageInfo[] =>
      results.filter((result): result is AppPackageInfo => result !== null),
    ); // Filter out null values;
  }

  static async ensureStorageDir(): Promise<void> {
    await ensureDirectoryExists(APP_PACKAGE_UPLOAD_DIR);
  }
}

const fetchAppLabel = (manifest: Manifest, resources: Resources): string => {
  // retrieve apk label (human readable name)
  let label = manifest.applicationLabel;
  /*
    This loop resolves the application label from nested string resource references.
    The initial \`label\` may not be a direct string; it could reference another resource.

    1. **Type Check**: The loop continues until \`label\` is a string, indicating it may be a resource reference.

    2. **Resource Resolution**: \`resources.resolve(label)\` retrieves all resources for the current \`label\`.

    3. **Select Resource**: It looks for the English version by checking the \`locale\` property. If found, its value is assigned to \`label\`.

    4. **Fallback**: If no English resource exists, the first resource in the array (\`all[0]\`) is used as a fallback.

    This process allows for proper resolution of the final label value through multiple layers of references.
    */

  // avoid endless loops -> break after 20 resolutions
  let resolutionSteps = 0;
  while (typeof label === "number" && resolutionSteps <= 20) {
    resolutionSteps++;
    const resolvedResources = resources.resolve(label);
    label = (
      resolvedResources.find(
        (res) => res.locale && res.locale.language === "en",
      ) || resolvedResources[0]
    )?.value;
  }
  // set package name as fall back if label could not be retrieved
  if (typeof label !== "string") label = manifest.package;

  return label;
};

/**
 * Generates cryptographic hashes for a given APK file.
 * @param {string} filePath - The path to the APK file.
 * @returns {Promise<Record<string, string>>} - A promise that resolves to an object containing the hashes.
 */
async function generateHashes(filePath: string): Promise<AppPackageHashes> {
  // Define separate hash variables for each algorithm
  const md5Hash = createHash("md5");
  const sha1Hash = createHash("sha1");
  const sha256Hash = createHash("sha256");

  // Create a readable stream for the APK file
  const fileStream = fs.createReadStream(filePath);

  // Create a transform stream that updates all hashes
  const hashTransform = new Transform({
    transform(chunk: Buffer, _: string, callback: TransformCallback) {
      // Update each hash individually
      md5Hash.update(chunk);
      sha1Hash.update(chunk);
      sha256Hash.update(chunk);
      callback();
    },
  });

  // Use pipeline to read the file and update each hash
  await pipeline(fileStream, hashTransform);

  // Finalize the hashes and return as an object
  return {
    md5: md5Hash.digest("hex"),
    sha1: sha1Hash.digest("hex"),
    sha256: sha256Hash.digest("hex"),
  };
}
