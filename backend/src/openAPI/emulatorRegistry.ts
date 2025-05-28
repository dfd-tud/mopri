/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { androidVersionSchema, avdInfoSchema, avdOptionsSchema, hardwareProfileSchema } from "@mopri/schema";

const emulatorRegistry = new OpenAPIRegistry();

emulatorRegistry.registerPath({
  method: "get",
  path: "/emulators/",
  description: "Retrieve existing emulators already present on the system.",
  summary: "Get existing emulators",
  responses: {
    200: {
      description: "A list of all available emulators with corresponding information about them.",
      content: { "application/json": { schema: avdInfoSchema.array() } },
    },
  },
  tags: ["emulators"],
});

emulatorRegistry.registerPath({
  method: "post",
  path: "/emulators/",
  description:
    "Create a new Android emulator on the system defined by the following parameters. Uses 'avdmanager create' in the background",
  summary: "Create new emulator",
  request: {
    body: {
      content: {
        "application/json": {
          schema: avdOptionsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Emulator created",
      content: {},
    },
  },
  tags: ["emulators"],
});

emulatorRegistry.registerPath({
  method: "get",
  path: "/emulators/hardware-profiles/",
  description:
    "Get a list of hardware profiles that can be emulated and which determine the screen size, resolution, density and hardware features of the emulator. E.g. 'pixel'",
  summary: "Get hardware profiles",
  responses: {
    200: {
      description: "List of emulatable devices known by avdmanager",
      content: { "application/json": { schema: hardwareProfileSchema} },
    },
  },
  tags: ["emulators"],
});

emulatorRegistry.registerPath({
  method: "get",
  path: "/emulators/api-levels/",
  description:
    "Get a list of api levels of Android system images that can be installed on the emulator e.g. 33, which is Android 13",
  summary: "Get Android api levels",
  responses: {
    200: {
      description: "List of all available Android api levels",
      content: { "application/json": { schema: androidVersionSchema.array() } },
    },
  },
  tags: ["emulators"],
});
export default emulatorRegistry;
