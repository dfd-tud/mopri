// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  AggregatedStaticAnalysisResults,
  EnrichedPermissions,
  EnrichedTrackingLibrary,
} from "@mopri/schema";
import { IStaticEnricher } from "./IStaticEnricher.js";

export class AggregateEnricher
  implements
    IStaticEnricher<
      {
        permissions: EnrichedPermissions;
        trackingLibraries: EnrichedTrackingLibrary[];
      },
      AggregatedStaticAnalysisResults
    >
{
  async enrich(rawData: {
    permissions: EnrichedPermissions;
    trackingLibraries: EnrichedTrackingLibrary[];
  }): Promise<AggregatedStaticAnalysisResults> {
    const permissions: EnrichedPermissions = rawData.permissions;
    const trackingLibraries: EnrichedTrackingLibrary[] =
      rawData.trackingLibraries;

    const numDangerousPermissions = permissions.systemPermissions.filter(
      (permission) => permission.protectionLevel === "dangerous",
    ).length;
    return {
      trackerLibraries: trackingLibraries.length,
      permissions:
        permissions.systemPermissions.length +
        permissions.customPermissions.length,
      specialPermissions: permissions.specialPermissions.length,
      customPermissions: permissions.customPermissions.length,
      dangerousPermissions: numDangerousPermissions,
    };
  }
}
