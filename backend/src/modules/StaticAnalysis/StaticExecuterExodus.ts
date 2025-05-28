// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import IStaticExecuter from "./IStaticExecuter.js";
import { ILogger } from "../../logger/ILogger.js";
import { ApkHelper, IResultStorageHelper } from "../../helpers/index.js";

import type {
  EnrichedTrackingLibrary,
  TrackingLibrary,
  EnrichedPermissions,
} from "@mopri/schema";
import { RecordingResultTypes } from "@mopri/schema";
import { StaticAnalyzerExodus } from "./StaticAnalyzers/StaticAnalyzerExodus.js";
import {
  IStaticAnalyzer,
  StaticAnalysisOutput,
} from "./StaticAnalyzers/IStaticAnalyzer.js";
import { IStaticEnricher } from "./StaticEnrichers/IStaticEnricher.js";
import { PermissionsEnricher } from "./StaticEnrichers/PermissionsEnricher.js";
import { TrackingLibrariesEnricherExodus } from "./StaticEnrichers/TrackingLibrariesEnricherExodus.js";
import { AggregateEnricher } from "modules/StaticAnalysis/StaticEnrichers/AggregateEnricher.js";

export interface EnrichedStaticCollectorExodusOutput
  extends StaticAnalysisOutput {
  trackerLibraries: EnrichedTrackingLibrary[];
}

export class StaticExecuterExodus implements IStaticExecuter {
  name = StaticExecuterExodus.name;
  constructor(
    public appPackageStorageId: string,
    public storageHelper: IResultStorageHelper,
    public logger: ILogger,
  ) {}
  async executeAnalysis() {
    const apkHelper = new ApkHelper(this.appPackageStorageId);
    const pathToBaseApk = await apkHelper.getBaseApkPath();
    const analyzer: IStaticAnalyzer = new StaticAnalyzerExodus();
    try {
      this.logger.log(this.name, "Exodus analysis started.", "start");
      const analysisResults = await analyzer.analyze(pathToBaseApk);
      this.logger.log(this.name, "Exodus analysis ended.", "stop");
      for (const [key, value] of Object.entries(analysisResults)) {
        const outputFile = await this.storageHelper.saveResultToJsonFile(
          value,
          key,
          "json",
          "collection",
        );
        this.storageHelper.registerResult(
          "collection",
          this.name,
          key as RecordingResultTypes,
          "static",
          outputFile,
        );
      }
      this.logger.log(this.name, "Saved Exodus output to file.");
    } finally {
      await apkHelper.close();
    }
  }

  private async enrichPermissions(
    permissions: string[],
  ): Promise<EnrichedPermissions> {
    const enricher: IStaticEnricher<string[], EnrichedPermissions> =
      new PermissionsEnricher();
    const enrichedPermissions = await enricher.enrich(permissions);
    const outputFile = await this.storageHelper.saveResultToJsonFile(
      enrichedPermissions,
      RecordingResultTypes.Permissions,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.Permissions,
      "static",
      outputFile,
    );
    return enrichedPermissions;
  }

  private async enrichTrackingLibraries(trackingLibraries: TrackingLibrary[]): Promise<EnrichedTrackingLibrary[]> {
    const trackingLibrariesEnricher = new TrackingLibrariesEnricherExodus();
    const enrichedTrackingLibraries: EnrichedTrackingLibrary[] =
      await trackingLibrariesEnricher.enrich(trackingLibraries);

    const outputFile = await this.storageHelper.saveResultToJsonFile(
      enrichedTrackingLibraries,
      RecordingResultTypes.TrackerLibraries,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.TrackerLibraries,
      "static",
      outputFile,
    );
    return enrichedTrackingLibraries;
  }
  private async aggregateResults(
    permissions: EnrichedPermissions,
    trackingLibraries: EnrichedTrackingLibrary[],
  ) {

    const aggregateEnricher = new AggregateEnricher();
    const aggregatedStaticAnalysisResults = await aggregateEnricher.enrich({permissions, trackingLibraries});
    const outputFile = await this.storageHelper.saveResultToJsonFile(
      aggregatedStaticAnalysisResults,
      RecordingResultTypes.AggregatedFiguresStaticAnalysis,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.AggregatedFiguresStaticAnalysis,
      "static",
      outputFile,
    );
  }
  async enrich() {
    this.logger.log(this.name, "Exodus output enrichment started.", "start");

    let permissions: string[] | null = null;
    let trackingLibraries: TrackingLibrary[] | null = null;

    // Load collection outputs with error handling
    try {
      permissions = await this.storageHelper.loadResult<string[]>(
        "collection",
        RecordingResultTypes.Permissions,
      );
    } catch (e) {
      this.logger.error(this.name, `Failed to load permissions: ${e}`);
    }

    try {
      trackingLibraries = await this.storageHelper.loadResult<
        TrackingLibrary[]
      >("collection", RecordingResultTypes.TrackerLibraries);
    } catch (e) {
      this.logger.error(this.name, `Failed to load tracking libraries: ${e}`);
    }

    // Check for missing tracking libraries
    if (!trackingLibraries) {
      this.logger.error(
        this.name,
        "Missing tracking libraries, cannot proceed.",
      );
      return;
    }

    // Enrich tracking libraries
    const enrichedTrackingLibraries: EnrichedTrackingLibrary[] =
      await this.enrichTrackingLibraries(trackingLibraries);

    if (!permissions) {
      this.logger.error(
        this.name,
        "Missing permissions cannot aggregateResults",
      );
      return;
    }

    const enrichedPermissions = await this.enrichPermissions(permissions);
    try {
      await this.aggregateResults(
        enrichedPermissions,
        enrichedTrackingLibraries,
      );
    } catch (e) {
      this.logger.error(
        this.name,
        `Failed to aggregate static analysis results: ${e}`,
      );
    }

    this.logger.log(this.name, "Exodus output enrichment ended.", "stop");
  }
}
