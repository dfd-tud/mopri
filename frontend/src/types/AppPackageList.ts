/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type AppPackageInfo = { label: string; package: string; version: string; filename: string }

export interface AppPackageList {
  uploadedPackages: AppPackageList[]
}
