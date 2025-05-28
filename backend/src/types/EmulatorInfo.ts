/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface AvdInfo {
    name: string;
    device?: string;
    path: string;
    target: string;
    sdCard: string; // Size is represented as a string (e.g., "512 MB")
    basedOn: string; // New property for Based On information
}
