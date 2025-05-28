// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export default interface IDynamicCollector {
  name: string;
  setup?(): Promise<void>;
  cleanup?(): Promise<void>;
  startCollection(): Promise<void>;
  stopCollection(): Promise<void>;
  postProcess?(): Promise<void>;
}

export type CollectionState =
  | "init"
  | "setup"
  | "running"
  | "stoped"
  | "cleaned";
