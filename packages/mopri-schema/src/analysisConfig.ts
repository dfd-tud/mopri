/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { z } from "zod";

// literal iteration => https://danielbarta.com/literal-iteration-typescript/
export const DeviceTypes = ["emulator", "physical"] as const;
export enum TrafficRecordingMethod {
  TweaselBasic = "TweaselBasic",
  TweaselWithHttpTools = "TweaselWithHttpTools",
  TweaselWithAPKPatching = "TweaselWithAPKPatching",
  PCAPDroidWithFriTap = "PCAPDroidWithFriTap",
  PCAPDroidMetaOnly = "PCAPDroidMetaOnly",
}

const deviceTypeSchema = z.enum(DeviceTypes);
export type DeviceType = z.infer<typeof deviceTypeSchema>;

// translated from typescript types/interface created by me to zodSchemas using ChatGPT
const trafficRecordingMethodSchema = z.nativeEnum(TrafficRecordingMethod);

// Define the TrafficRecordingOptions schema
const trafficRecordingOptionsSchema = z.object({
  enableDeviceDataCapture: z.boolean(),
  enableScreenRecording: z.boolean(),
  trafficRecordingMethod: trafficRecordingMethodSchema,
});

const emulatorOptionsSchema = z.object({ emulatorName: z.string() });

// Define the UserConfigDyn schema
const analysisConfDynSchema = z
  .object({
    deviceType: deviceTypeSchema.optional(),
    emulatorOptions: emulatorOptionsSchema.optional(),
    enableTrafficRecording: z.boolean(),
    trafficRecordingOptions: trafficRecordingOptionsSchema.optional(),
  })
  .refine(
    (data) => {
      // emulatorOptions are required when deviceType is "emulator"
      if (data.enableTrafficRecording) {
        if (data.deviceType === "emulator") {
          return data.emulatorOptions !== undefined;
        }
      }
      return true; // If deviceType is not "emulator", no need for emulatorOptions
    },
    {
      message: "emulatorName is required when deviceType is 'emulator'",
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
const analysisConfStatSchema = z.object({
  enableExodusModule: z.boolean(),
});

// Define the UserConfigFrontend schema
export const analysisConfigSchema = z.object({
  analysisName: z.string().min(1).trim(),
  note: z.string(),
  appPackageStorageId: z.string().min(1).trim(),
  staticConfig: analysisConfStatSchema,
  dynamicConfig: analysisConfDynSchema,
});

export const analysisMetaSchema = analysisConfigSchema.extend({
  analysisId: z.string().length(16),
  createdAt: z.date(),
});

// Infer TypeScript types from the Zod schemas
export type TrafficRecordingOptions = z.infer<
  typeof trafficRecordingOptionsSchema
>;
export type AnalysisConfigDynamic = z.infer<typeof analysisConfDynSchema>;
export type AnalysisConfigStatic = z.infer<typeof analysisConfStatSchema>;
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>;
export type AnalysisMeta = z.infer<typeof analysisMetaSchema>;
