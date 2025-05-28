// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export default interface IEmulator {
  name: string;
  avdName: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}
