// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { execa } from "execa";
import { ApkHelper } from "../../../../helpers/ApkHelper.js";
import { IResultStorageHelper } from "../../../../helpers/ResultStorageHelper.js";
import { Readable } from "stream";
import path from "path";
import { ILogger } from "../../../../logger/ILogger.js";

class AppPatchingManager {
  name = AppPatchingManager.name;
  constructor(
    private storageHelper: IResultStorageHelper,
    private logger: ILogger,
  ) {}
  async execute() {
    const analysisMeta = await this.storageHelper.getAnalysisMeta();
    const apkHelper = new ApkHelper(analysisMeta.appPackageStorageId);
    const apkPath = await apkHelper.getPackageFilePath();
    const proc = execa("npx", ["apk-mitm", apkPath]);
    const readableStream: Readable | null = proc.stdout;
    if (readableStream) {
      readableStream.setEncoding("utf8");
      readableStream.on("data", (outputLine: string) => {
        this.logger.log(this.name, outputLine);
      });
    }
    await proc;
    return this.getPatchedFilename(apkPath);
  }

  getPatchedFilename(inputPath: string) {
    const fileExtension = path.extname(inputPath);
    const baseName = path.basename(inputPath, fileExtension);
    return `${baseName}-patched${fileExtension}`;
  }
}
