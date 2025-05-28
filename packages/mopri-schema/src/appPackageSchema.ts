/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from "./zod.config.js";
export const appPackageTypeSchema = z
  .enum(["apk", "xapk"])
  .openapi({ description: "The archive type of the uploaded app package" });
export type AppPackageType = z.infer<typeof appPackageTypeSchema>;

export const appPackageHashesSchema = z
  .object({
    md5: z.string().openapi({
      description:
        "MD5 hash of the APK file. This algorithm produces a 128-bit hash value, typically represented as a 32-character hexadecimal number.",
      example: "d41d8cd98f00b204e9800998ecf8427e",
    }),
    sha1: z.string().openapi({
      description:
        "SHA-1 hash of the APK file. This algorithm produces a 160-bit hash value, usually represented as a 40-character hexadecimal number.",
      example: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    }),
    sha256: z.string().openapi({
      description:
        "SHA-256 hash of the APK file. This algorithm produces a 256-bit hash value, typically represented as a 64-character hexadecimal number.",
      example:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }),
  })
  .openapi({
    description:
      "A set of cryptographic hashes generated from the uploaded apk or xapk archive using different algorithms. These hashes can be used to verify the integrity and authenticity of the APK.",
  });
export type AppPackageHashes = z.infer<typeof appPackageHashesSchema>; 

export const appPackageInfoSchema = z
  .object({
    storageId: z.string().openapi({
      description:
        "Id that used as a dir name in the uploads directory. Combination of package name and version.",
      example: "de.swr.avp.ard_10.13.0",
    }),
    label: z.string().openapi({
      description: "The user-friendly name of the application package.",
      example: "My Application",
    }),
    package: z.string().openapi({
      description: "The unique package identifier for the application.",
      example: "com.example.myapplication",
    }),
    version: z.string().openapi({
      description: "The version number of the application.",
      example: "1.0.0",
    }),
    hashes: appPackageHashesSchema,
    type: appPackageTypeSchema,

    uploadTime: z.number().openapi({
      description:
        "The timestamp of the last modification of the application package.",
      example: 1633072800, // Example timestamp
    }),
  })
  .openapi({ description: "Information about stored app package" });

export type AppPackageInfo = z.infer<typeof appPackageInfoSchema>;

export const appPackageInfoListSchema = appPackageInfoSchema
  .array()
  .openapi({ description: "AppPackageInfo list" });
export type AppPackageInfoList = z.infer<typeof appPackageInfoListSchema>;
