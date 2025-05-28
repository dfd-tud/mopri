// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export default interface IDynamicExecuter {
  name: string;
  startRecording(): void;
  stopRecording(): Promise<void>;
  /*
   * Resolves when recording is done
   */
  waitForStop(): Promise<void>;
  enrich(): void;
}
