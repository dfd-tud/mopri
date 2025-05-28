/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import emulatorRegistry from "./emulatorRegistry.js";
import { OpenAPIDefinitions } from "@asteasolutions/zod-to-openapi/dist/openapi-registry.js";
import appPackageRegistry from "./appPackageRegistry.js";
import analysisRegistry from "./analysisRegistry.js";

const apiDefinitions: OpenAPIDefinitions[] = [
  ...emulatorRegistry.definitions,
  ...appPackageRegistry.definitions,
  ...analysisRegistry.definitions,
];

// Generate OpenAPI specification
const generator = new OpenApiGeneratorV31(apiDefinitions);

export const openApiSpec = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "mopri API",
    version: "2.0.0",
  },
});
