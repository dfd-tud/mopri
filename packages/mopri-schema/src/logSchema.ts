/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type LogType =
  | "log"
  | "error"
  | "callToAction"
  | "start"
  | "stop"
  | "done";
export interface Log {
  content: string;
  module: string;
  type: LogType;
}
