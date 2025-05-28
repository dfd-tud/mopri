/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { z } from "zod";

export enum RecordingResultTypes {
  Permissions = "permissions",
  TrackerLibraries = "trackerLibraries",
  NetworkPCAP = "networkPCAP",
  NetworkPCAPng = "networkPCAPng",
  NetworkPCAPTLSExtract = "networkPCAPTLSExtract",
  NetworkHar = "networkHar",
  NetworkTLSKeyLog = "networkTLSKeyLog",
  ScreenRecording = "screenRecording",
  DeviceData = "deviceData",
  EnrichedEntities = "enrichedEntities",
  SensitiveDataLeakageRecords = "sensitiveDataLeakageRecords",
  AggregatedFiguresTrafficAnalysis = "aggregatedFiguresTA",
  AggregatedFiguresStaticAnalysis = "aggregatedFiguresSA",
  AdapterMatches = "adapterMatches",
}

export const AnalysisStageSchema = z.enum(["collection", "enrichment"]);
export type AnalysisStage = z.infer<typeof AnalysisStageSchema>;

// Define a type for the structure of each recording type
export type RecordingMetaEntry = {
  moduleName: string;
  analysisType: "dynamic" | "static";
  startCaptureTime?: number;
  file: string;
  errorMsg?: string;
};

// Create a type that maps each RecordingType to its corresponding RecordingMetaEntry
export type RecordingMeta = {
  [K in RecordingResultTypes]?: RecordingMetaEntry;
};

const trackingLibrarySchema = z.object({ name: z.string(), id: z.number() });
export type TrackingLibrary = z.infer<typeof trackingLibrarySchema>;

const enrichedTrackingLibrarySchema = z.object({
  name: z.string(),
  id: z.number(),
  description: z.string(),
  creationDate: z.string(), // You might want to use z.date() if you are working with Date objects
  codeSignature: z.string(),
  networkSignature: z.string(),
  website: z.string().url(), // Assuming the website should be a valid URL
  categories: z.array(z.string()),
});

export type EnrichedTrackingLibrary = z.infer<
  typeof enrichedTrackingLibrarySchema
>;

export type ProtectionLevel = "normal" | "dangerous" | "signature";
export type EnrichedPermission = {
  name: string;
  label?: string;
  summary?: string;
  description?: string;
  protectionLevel?: ProtectionLevel;
};
export type EnrichedPermissions = {
  systemPermissions: EnrichedPermission[];
  specialPermissions: EnrichedPermission[];
  customPermissions: string[];
};

export const staticResultFileMetaSchema = z.object({
  staticUrl: z.string(),
  startCaptureTime: z.number(),
});

export type StaticResultFileMeta = z.infer<typeof staticResultFileMetaSchema>;

export interface ReceivingEntity {
  hostname: string;
  ip?: string;
}
export interface ReceivingEntityWithAggregation extends ReceivingEntity {
  requestCount: number;
  hasOnlyEncryptedTraffic: boolean;
}

// Define the structure for blocklist entries
export interface BlocklistEntry {
  url: string;
  name: string;
  author: string;
}

export interface IpWhoisInfo {
  org?: {
    asn?: number;
    orgName?: string;
    domain?: string;
  };
  location?: {
    country?: string;
    countryCode?: string;
    flagEmoji?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    isEU?: boolean;
  };
}

export interface DomainWhoisInfo {
  orgName?: string;
}

export interface EnrichedReceivingEntity
  extends ReceivingEntityWithAggregation {
  domainWhoisInfo?: DomainWhoisInfo;
  ipWhoisInfo?: IpWhoisInfo;
  blockListHits: BlocklistEntry[];
}

export interface DeviceData {
  platform: "android" | "ios";
  /** The type of device (emulator, physical device). */
  runTarget: string;
  /** The device's name **/
  deviceName?: string;
  /** The version of the OS. */
  osVersion?: string;
  /** The build string of the OS. */
  osBuild?: string;
  /** The device's manufacturer. */
  manufacturer?: string;
  /** The device's model. */
  model?: string;
  /** The device's model code name. */
  modelCodeName?: string;
  /** Architectures/ABIs supported by the device. */
  architectures?: string;
  /** The device's imei **/
  imei?: string;
  adId?: string;
}
export interface SensitiveDataLeakageRecords {
  [id: string]: {
    dataCategoriesFound: string[];
    receiver: ReceivingEntity;
  };
}
export interface AggregatedFigures {
  countries: number;
  nonEuCountries: number;
  hostingProviders: number;
  organisations: number;
  hostnames: number;
  ips: number;
  nonEURequests: number;
  totalRequests: number;
  receiversOnBlocklist: number;
  requestsToReceiversOnBlocklist: number;
  requestsWithSensitiveData: number;
  sensitiveValuesTransmitted: number;
}

export interface AggregatedStaticAnalysisResults {
  permissions: number;
  dangerousPermissions: number;
  specialPermissions: number;
  customPermissions: number;
  trackerLibraries: number;
}
