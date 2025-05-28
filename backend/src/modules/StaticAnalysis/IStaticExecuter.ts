// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export default interface IStaticExecuter {
  name: string;
  appPackageStorageId: string;
  executeAnalysis(): Promise<void>;
  enrich(): Promise<void>;
}
