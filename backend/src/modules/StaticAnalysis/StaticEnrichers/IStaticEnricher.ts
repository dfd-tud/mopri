// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface IStaticEnricher<TInput, TOutput> {
  enrich(rawData: TInput): Promise<TOutput>
}
