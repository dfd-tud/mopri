/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from "./zod.config.js";

export const apiLevelSchema = z.number().openapi({
  example: 33,
  description: "Android API Level of the system image to use for the emulator",
});

export type ApiLevel = z.infer<typeof apiLevelSchema>;

export const avdOptionsSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .trim()
      .regex(/^[a-zA-Z0-9._-]+$/, {
        message:
          "String can only contain letters (a-z, A-Z), numbers (0-9), dots (.), underscores (_), and hyphens (-).",
      })
      .openapi({
        example: "myEmulator",
        description: "Name of the new emulator that is used to identify it",
      }),
    apiLevel: apiLevelSchema,
    variant: z
      .enum(["default", "google_apis", "google_apis_playstore"])
      .openapi({
        description:
          "The variant of the system image to use for the emulator. It determines the features and services available onthe emulator",
      }),
    device: z.string().openapi({
      example: "pixel",
      description:
        "Device name to use for the emulator, which determines the screen size, resolution, density and hardware features of the emulator",
    }),
    architecture: z
      .enum(["auto-detect", "x86", "x86_64", "armeabi-v7a", "arm64-v8a"])
      .openapi({
        example: "x86_64",
        description:
          "The architecture of the system image to use for the emulator",
      }),
  })
  .openapi("AVDOptions");
// Infer the TypeScript type from the Zod schema
export type AvdOptions = z.infer<typeof avdOptionsSchema>;

export const androidVersionSchema = z.object({
  apiLevel: apiLevelSchema,
  versionName: z.string().openapi({
    description: "Full human readable name of that Android version",
    example: "Android 13",
  }),
});
export type AndroidVersion = z.infer<typeof androidVersionSchema>;

export const hardwareProfileSchema = z.object({
  id: z.number().openapi({
    description: "The unique identifier for the device",
    example: 30,
  }),
  stringId: z.string().openapi({
    description: "The alternative unique string identifier for the device",
    example: "pixel_6_pro",
  }),
  name: z.string().openapi({
    description: "The human readable name of the device",
    example: "Pixel 6 Pro",
  }),
});

export type HardwareProfile = z.infer<typeof hardwareProfileSchema>;

export const avdInfoSchema = z
  .object({
    name: z
      .string()
      .describe("The name of the AVD (Android Virtual Device)")
      .openapi({
        description: "The name of the AVD.",
        example: "MyAVD",
      }),
    device: z
      .string()
      .optional()
      .describe("The device type for the AVD")
      .openapi({
        description: "The type of device for the AVD.",
        example: "Pixel 4",
      }),
    path: z.string().describe("The file path for the AVD").openapi({
      description: "The file path where the AVD is stored.",
      example: "/home/user/.android/avd/myavd.avd",
    }),
    target: z.string().describe("The target SDK version for the AVD").openapi({
      description: "The target variant of the AVD's system image.",
      example: "Google APIs (Google Inc.)",
    }),
    sdCard: z.string().describe("The size of the SD card for the AVD").openapi({
      description: "The size of the SD card allocated for the AVD.",
      example: "512 MB",
    }),
    basedOn: z
      .string()
      .describe("Information about what the AVD is based on")
      .openapi({
        description: "Details about the base configuration of the AVD.",
        example: "Android 11.0 ('R') Tag/ABI: default/x86_64",
      }),
  })
  .describe("AVD Information Schema");

export type AvdInfo = z.infer<typeof avdInfoSchema>;
