/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type AnalysisConfig = {
  analysisId: string,
  analysisName: string,
  createdAt: Date,
  note: string,
  appPackageName: string,
}


export type deviceType = "emulator" | "physical";
