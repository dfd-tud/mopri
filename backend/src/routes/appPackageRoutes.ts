/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router, Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import { ApkHelper } from "../helpers/index.js";
import path from "path";
import { FileNotFoundError } from "../types/Errors.js";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const appPackageId = req.params.id;
  if (!appPackageId) return res.status(400).send("Missing parameter id");
  try {
    const appPackageInfo = await ApkHelper.getAppPackageInfo(appPackageId);
    return res.json(appPackageInfo);
  } catch (e) {
    if (e instanceof FileNotFoundError) {
      return res.status(404).send(`Package with id ${appPackageId} not found`);
    } else {
      return res.status(500).send("Internal server error");
    }
  }
});

// get all uploaded appPackages or appPackage by id
router
  .route("/")
  .get(async (req: Request, res: Response) => {
    const list = await ApkHelper.getUploadedAppPackages();
    const returnObj = { uploadedPackages: list };
    res.send(JSON.stringify(returnObj));
  })
  // end point for uploading new app installation packages (e.g. apks)
  .post(async (req: Request, res: Response) => {
    if (req.files?.appPackage) {
      const appPackage: UploadedFile = req.files.appPackage as UploadedFile;
      //mv to tmp file with extension
      const newTmpPath =
        appPackage.tempFilePath + path.extname(appPackage.name);
      try {
        appPackage.mv(newTmpPath);
        await ApkHelper.storeApk(newTmpPath);
        res.status(200).send("Successfully uploaded");
      } catch (error) {
        console.error(error);
        res.status(500).json(error);
      }
    } else {
      res.status(400).send("No file in upload.");
    }
  });

export default router;
