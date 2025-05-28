/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Subject } from "rxjs";
import { Log, LogType } from "@mopri/schema";
import { ILogger } from "./ILogger.js";

export class SSELogger implements ILogger {
  private logSubject = new Subject<Log>();
  /**
   * Emit a new log to the RxJS subject
   * @param log
   */
  log(moduleName: string, content: string, type: LogType = "log"): void {
    console.log(content);
    this.logSubject.next({ module: moduleName, content: content, type: type });
  }
  error(moduleName: string, content: string): void {
    this.log(moduleName, content, "error");
  }

  subscribe(func: (log: Log) => void): void {
    this.logSubject.subscribe(func);
  }
}

/**
 * SSE message serializer
 * @param event: Event name
 * @param data: Event data
 */
export function serializeSSEvent(event: string, data: any): string {
  const jsonString = JSON.stringify(data);
  return `event: ${event}\ndata: ${jsonString}\n\n`;
}
