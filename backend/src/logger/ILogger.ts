/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LogType } from "@mopri/schema";
export interface ILogger {
  log(moduleName: string, content: string, type?: LogType): void;
  error(moduleName: string, content: string): void;
}
