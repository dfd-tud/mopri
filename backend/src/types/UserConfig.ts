/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import crypto from "crypto";
import { z } from "zod";

// literal iteration => https://danielbarta.com/literal-iteration-typescript/
export const DeviceTypes = ["emulator", "physicalDevice"] as const;
export enum TrafficCollectorType {
  TweaselBasic = "TweaselBasic",
  TweaselWithHttpTools = "TweaselWithHttpTools",
}

// translated from typescript types/interface created by me to zodSchemas using ChatGPT
const trafficRecordingMethodSchema = z.nativeEnum(TrafficCollectorType);

// Define the TrafficRecordingOptions schema
const trafficRecordingOptionsSchema = z.object({
  enableDeviceDataCapture: z.boolean(),
  enableScreenRecording: z.boolean(),
  trafficRecordingMethod: trafficRecordingMethodSchema,
});

// Define the EmulatorOptions schema (assuming you have this defined)
const emulatorOptionsSchema = z.object({
  emulatorName: z.string().min(1).trim(),
  emulatorCreationOptions: z
    .object({
      apiLevel: z.union([
        z.literal(34),
        z.literal(33),
        z.literal(32),
        z.literal(31),
      ]),
      variant: z.enum(["default", "google_apis", "google_apis_playstore"]),
    })
    .optional(),
});

// Define the UserConfigDyn schema
const userConfigDynSchema = z
  .object({
    deviceType: z.enum(DeviceTypes).optional(),
    emulatorOptions: emulatorOptionsSchema.optional(),
    enableTrafficRecording: z.boolean(),
    trafficRecordingOptions: trafficRecordingOptionsSchema.optional(),
  })
  .refine(
    (data) => {
      // Make emulatorOptions required if deviceType is "emulator"
      if (data.enableTrafficRecording) {
        if (data.deviceType === "emulator") {
          return data.emulatorOptions !== undefined;
        }
      }
      return true; // If deviceType is not "emulator", no need for emulatorOptions
    },
    {
      message: "emulatorOptions is required when deviceType is 'emulator'",
      path: ["emulatorOptions"], // Path to the error
    },
  )
  .refine(
    (data) => {
      // Make emulatorOptions required if deviceType is "emulator"
      if (data.enableTrafficRecording) {
        return data.trafficRecordingOptions !== undefined;
      }
      return true; // If deviceType is not "emulator", no need for emulatorOptions
    },
    {
      message:
        "trafficRecordingOptions is required when enableTrafficRecording is true",
      path: ["trafficRecordingOptions"], // Path to the error
    },
  );

// Define the UserConfigStatic schema
const userConfigStaticSchema = z.object({
  enableExodusModule: z.boolean(),
});

// Define the UserConfigFrontend schema
const userConfigFrontendSchema = z.object({
  analysisName: z.string().min(1).trim(),
  note: z.string(),
  appPackageName: z.string().min(1).trim(),
  staticConfig: userConfigStaticSchema,
  dynamicConfig: userConfigDynSchema,
});

export const UserConfigSchema = userConfigFrontendSchema.extend({
  analysisId: z.string().length(16),
  createdAt: z.date(),
});

// Infer TypeScript types from the Zod schemas
export type TrafficRecordingMethod = z.infer<
  typeof trafficRecordingMethodSchema
>;
export type TrafficRecordingOptions = z.infer<
  typeof trafficRecordingOptionsSchema
>;
export type UserConfigDyn = z.infer<typeof userConfigDynSchema>;
export type UserConfigStatic = z.infer<typeof userConfigStaticSchema>;
export type UserConfigFrontend = z.infer<typeof userConfigFrontendSchema>;
export type UserConfig = z.infer<typeof UserConfigSchema>;

export const frontendToBackendUserConfig = userConfigFrontendSchema.transform(
  (body) => {
    const { analysisName, appPackageName, note, staticConfig, dynamicConfig } =
      body;

    const userConfig: UserConfig = {
      analysisId: crypto.randomBytes(8).toString("hex"),
      createdAt: new Date(),
      note,
      analysisName,
      appPackageName,
      dynamicConfig: {
        deviceType: dynamicConfig.deviceType,
        enableTrafficRecording: dynamicConfig.enableTrafficRecording,
        ...(dynamicConfig.enableTrafficRecording && {
          trafficRecordingOptions: {
            enableScreenRecording:
              dynamicConfig.trafficRecordingOptions.enableScreenRecording,
            enableDeviceDataCapture:
              dynamicConfig.trafficRecordingOptions.enableDeviceDataCapture,
            trafficRecordingMethod:
              dynamicConfig.trafficRecordingOptions.trafficRecordingMethod,
          },
        }),
        ...(dynamicConfig.deviceType === "emulator" && {
          emulatorOptions: dynamicConfig.emulatorOptions,
        }),
      },
      staticConfig: {
        enableExodusModule: staticConfig.enableExodusModule,
      },
    };

    return userConfig;
  },
);

// Testing with example data
//const frontendData = {
//  analysisName: "Test Analysis",
//  appPackageName: "com.example.app",
//  note: "This is a note.",
//  staticConfig: {
//    enableExodusModule: true,
//  },
//  dynamicConfig: {
//    deviceType: "emulator",
//    enableTrafficRecording: true,
//    trafficRecordingOptions: {
//      enableDeviceDataCapture: true,
//      enableScreenRecording: false,
//      trafficRecordingMethod: "TweaselWithHTTPTools",
//    },
//    emulatorOptions: {
//      emulatorName: "MyEmulator",
//      emulatorCreationOptions: {
//        apiLevel: 34,
//        variant: "google_apis",
//      },
//    },
//  },
//};
//console.log(getUserConfigFromFrontendBody(frontendData));
