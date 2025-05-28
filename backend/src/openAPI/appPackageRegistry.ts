/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import z from "../configs/zod.config.js";
import { appPackageInfoListSchema } from "@mopri/schema";
const appPackageRegistry = new OpenAPIRegistry();

appPackageRegistry.registerPath({
  method: "get",
  path: "/appPackages/",
  description:
    "Get a list of all uploaded app packages (apk only) with further information about each package",
  summary: "Get all uploaded app packages",
  responses: {
    200: {
      description: "A list of uploaded packages",
      content: {
        "application/json": {
          schema: appPackageInfoListSchema,
        },
      },
    },
  },
  tags: ["appPackages"],
});

appPackageRegistry.registerPath({
  method: "post",
  path: "/appPackages/",
  description: "Upload new app package in form of a .apk file",
  summary: "Upload app package",
  requestBody: {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties: { appPackage: { type: "string", format: "binary" } },
        },
      },
    },
  },
  responses: {
    200: {
      description: "A list of uploaded packages",
      content: {
        "application/json": { schema: appPackageInfoListSchema },
      },
    },
    400: {
      description: "Error: No file uploaded",
      content: {
        "text/plain": {
          schema: z.string().openapi({ example: "No file in upload." }),
        },
      },
    },
  },
  tags: ["appPackages"],
});

export default appPackageRegistry;
