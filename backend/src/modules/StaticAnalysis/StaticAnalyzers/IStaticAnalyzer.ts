// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface StaticAnalysisOutput {
  permissions: string[];
  trackerLibraries: { name: string; id: number }[];
}

export interface IStaticAnalyzer {
  analyze(pathToApk: string): Promise<StaticAnalysisOutput>;
}
