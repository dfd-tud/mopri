// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getVenv } from "autopy";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { IStaticAnalyzer, StaticAnalysisOutput } from "./IStaticAnalyzer.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ExodusOutputJSONModel {
  application: {
    handle: string;
    version_name: string;
    version_code: string;
    uaid: string;
    name: string;
  };
  apk: { path: string; checksum: string };
  permissions: string[];
  libraries: string[];
  trackers: { name: string; id: number }[];
}

export class StaticAnalyzerExodus implements IStaticAnalyzer {
  private pathToPythonScript = path.join(
    __dirname,
    "/dependencies/exodus_analysis.py",
  );

  public async analyze(pathToAPK: string): Promise<StaticAnalysisOutput> {
    const venvSettings = {
      name: "ExodusAnalyze",
      pythonVersion: "~3.11", // Use any Python 3.11.x version.
      requirements: [{ name: "exodus-core", version: "==1.3.13" }],
    };

    const python = await getVenv(venvSettings);
    try {
      const { stdout } = await python("python", [
        this.pathToPythonScript,
        pathToAPK,
      ]);
      const exodusResults = JSON.parse(stdout) as ExodusOutputJSONModel;
      return {
        permissions: exodusResults.permissions,
        trackerLibraries: exodusResults.trackers,
      };
    } catch (e) {
      console.error(e);
      throw new Error("Failed to run Exodus analysis.");
    }
  }
}
