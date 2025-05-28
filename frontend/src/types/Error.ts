/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type FieldValidationError = {
  field: string, 
  message: string
}
export type ValidationErrorResponse = {
  status: string, 
  message: string, 
  errors: FieldValidationError[]
}
