// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { EnrichedTrackingLibrary, TrackingLibrary } from "@mopri/schema";
import { IStaticEnricher } from "./IStaticEnricher.js";
import ky from "ky";

interface ExodusReportsJsonModel {
  trackers: {
    [key: string]: {
      id: number;
      name: string;
      description: string;
      creation_date: string;
      code_signature: string;
      network_signature: string;
      website: string;
      categories: string[];
      documentation: string[];
    };
  };
}

export class TrackingLibrariesEnricherExodus
  implements IStaticEnricher<TrackingLibrary[], EnrichedTrackingLibrary[]>
{
  private ExodusTrackersRepoURL: string =
    "https://reports.exodus-privacy.eu.org/api/trackers";

  async enrich(rawData: TrackingLibrary[]): Promise<EnrichedTrackingLibrary[]> {
    const trackerDescriptions = await this.downloadExodusTrackerDescriptions();
    return rawData.map((l: TrackingLibrary): EnrichedTrackingLibrary => {
      const detailsFromWeb = Object.values(trackerDescriptions.trackers).find(
        (e) => e.id == l.id,
      );
      return {
        name: detailsFromWeb?.name ?? l.name,
        id: detailsFromWeb?.id ?? l.id,
        description: detailsFromWeb?.description ?? "not found",
        creationDate: detailsFromWeb?.creation_date ?? "not found",
        codeSignature: detailsFromWeb?.code_signature ?? "not found",
        networkSignature: detailsFromWeb?.network_signature ?? "not found",
        website: detailsFromWeb?.website ?? "not found",
        categories: detailsFromWeb?.categories ?? [],
      };
    });
  }

  private async downloadExodusTrackerDescriptions(): Promise<ExodusReportsJsonModel> {
    return (await ky
      .get(this.ExodusTrackersRepoURL)
      .json()) as ExodusReportsJsonModel;
  }
}
