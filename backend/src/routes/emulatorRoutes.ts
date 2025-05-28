/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { AvdDevice } from "@wtto00/android-tools";
import { createEmulator, EmulatorOptions } from "andromatic";
import { Router, Request, Response } from "express";
import {
  HardwareProfile,
  AndroidVersion,
  AvdInfo,
  avdOptionsSchema,
  AvdOptions,
} from "@mopri/schema";
import {
  getAndroidTools,
  getLocalArch,
  parseAVDManagerDeviceId,
} from "../utils.js";
import { ExecaError } from "execa";

const router = Router();

/*
 * Get existing emulators
 */
router.get("/", async (req: Request, res: Response) => {
  const androidTools = await getAndroidTools();
  try {
    const emulators = await androidTools.listAVDs();
    const responseList: AvdInfo[] = emulators.map((d): AvdInfo => {
      return {
        name: d.Name,
        device: d.Device,
        path: d.Path,
        target: d.Target,
        sdCard: d.Sdcard,
        basedOn: d.on,
      };
    });
    res.json(responseList);
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});

/*
 * Create new AVD
 */
router.post("/", async (req: Request, res: Response) => {
  const result = avdOptionsSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path[0], // Get the field name
      message: err.message, // Get the error message
    }));

    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }
  const avdOptions: AvdOptions = result.data;

  let arch = avdOptions.architecture;
  if (arch === "auto-detect") {
    // try to determine system architecture
    try {
      arch = getLocalArch();
    } catch (e) {
      return res.status(500).json({
        errorMsg:
          "Failed to detect your systems architecture, please select a preset architecture",
      });
    }
  }
  const emulatorOptions: EmulatorOptions = {
    apiLevel: avdOptions.apiLevel,
    variant: avdOptions.variant,
    architecture: arch,
    device: avdOptions.device,
  };
  try {
    await createEmulator(avdOptions.name, emulatorOptions);
    res.json({ successMsg: "Successfully created AVD" });
  } catch (error) {
    let errorMsg;
    // workaround because somehow error is not recognized as ExecaError
    if (error && typeof error === "object" && error.hasOwnProperty("stderr")) {
      errorMsg = "Could not create AVD - " + (error as ExecaError).stderr;
    } else {
      console.error(error);
      errorMsg = "Could not create AVD: unkown error";
    }
    res.status(500).json({ errorMsg });
  }
});

router.get("/hardware-profiles", async (req: Request, res: Response) => {
  const androidTools = await getAndroidTools();
  try {
    const hardwareProfiles: AvdDevice[] = await androidTools.listDevices();
    const responseList: HardwareProfile[] = hardwareProfiles.map(
      (d): HardwareProfile => {
        const { numericId, stringId } = parseAVDManagerDeviceId(d.id);
        return {
          id: numericId,
          stringId: stringId,
          name: d.Name,
        };
      },
    );
    res.json(responseList);
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});

router.get("/api-levels", async (req: Request, res: Response) => {
  /**
   * A list of Android API levels and their corresponding version names.
   * (created using GPT-4o: "typescript object giving me all android-api levels and corresponding version names as a list")
   */
  const androidApiLevels: AndroidVersion[] = [
    { apiLevel: 1, versionName: "Android 1.0" },
    { apiLevel: 2, versionName: "Android 1.1" },
    { apiLevel: 3, versionName: "Android 1.5 (Cupcake)" },
    { apiLevel: 4, versionName: "Android 1.6 (Donut)" },
    { apiLevel: 5, versionName: "Android 2.0 (Eclair)" },
    { apiLevel: 6, versionName: "Android 2.0.1 (Eclair)" },
    { apiLevel: 7, versionName: "Android 2.1 (Eclair)" },
    { apiLevel: 8, versionName: "Android 2.2 (Froyo)" },
    { apiLevel: 9, versionName: "Android 2.3 (Gingerbread)" },
    { apiLevel: 10, versionName: "Android 2.3.3 (Gingerbread)" },
    { apiLevel: 11, versionName: "Android 3.0 (Honeycomb)" },
    { apiLevel: 12, versionName: "Android 3.1 (Honeycomb)" },
    { apiLevel: 13, versionName: "Android 3.2 (Honeycomb)" },
    { apiLevel: 14, versionName: "Android 4.0 (Ice Cream Sandwich)" },
    { apiLevel: 15, versionName: "Android 4.0.3 (Ice Cream Sandwich)" },
    { apiLevel: 16, versionName: "Android 4.1 (Jelly Bean)" },
    { apiLevel: 17, versionName: "Android 4.2 (Jelly Bean)" },
    { apiLevel: 18, versionName: "Android 4.3 (Jelly Bean)" },
    { apiLevel: 19, versionName: "Android 4.4 (KitKat)" },
    { apiLevel: 20, versionName: "Android 4.4W (Wear)" },
    { apiLevel: 21, versionName: "Android 5.0 (Lollipop)" },
    { apiLevel: 22, versionName: "Android 5.1 (Lollipop)" },
    { apiLevel: 23, versionName: "Android 6.0 (Marshmallow)" },
    { apiLevel: 24, versionName: "Android 7.0 (Nougat)" },
    { apiLevel: 25, versionName: "Android 7.1 (Nougat)" },
    { apiLevel: 26, versionName: "Android 8.0 (Oreo)" },
    { apiLevel: 27, versionName: "Android 8.1 (Oreo)" },
    { apiLevel: 28, versionName: "Android 9.0 (Pie)" },
    { apiLevel: 29, versionName: "Android 10" },
    { apiLevel: 30, versionName: "Android 11" },
    { apiLevel: 31, versionName: "Android 12" },
    { apiLevel: 32, versionName: "Android 12L" },
    { apiLevel: 33, versionName: "Android 13" },
    { apiLevel: 34, versionName: "Android 14" },
  ];
  res.json(androidApiLevels);
});

export default router;
