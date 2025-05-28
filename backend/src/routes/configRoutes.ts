/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TrafficRecordingMethod } from "@mopri/schema";
import { Router, Request, Response } from "express";

const router = Router();

router.get(
  "/networkTrafficRecordingMethods",
  async (_req: Request, res: Response) => {
    const methods = Object.keys(TrafficRecordingMethod).filter((item) => {
      return isNaN(Number(item));
    });
    res.json(methods);
  },
);

export default router;
