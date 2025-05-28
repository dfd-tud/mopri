/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import express, { Express } from "express";
import fileUpload from "express-fileupload";
import swaggerUi from "swagger-ui-express";
import os from "os";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import { ResultStorageHelper } from "./helpers/ResultStorageHelper.js";

import analysisRoutes from "./routes/analysisRoutes.js";
import appPackageRoutes from "./routes/appPackageRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import emulatorRoutes from "./routes/emulatorRoutes.js";

import { openApiSpec } from "./openAPI/index.js";

const app: Express = express();

/*
 * ########################
 * # register middlewares #
 * ########################
 */
// enable json request body handling
app.use(express.json());
// fileUpload middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 1000 * 1024 * 1024 }, // Set limit to 1000 MB
  }),
);
// enable cors for all origins
// source: https://stackoverflow.com/a/34647929
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// expose static result dir
app.use("/result", express.static(ResultStorageHelper.getResultDir()));

/*
 * ###################
 * # register routes #
 * ###################
 */
app.use("/analysis", analysisRoutes);
app.use("/appPackages", appPackageRoutes);
app.use("/emulators", emulatorRoutes);
app.use("/config", configRoutes);

// Setup Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;
