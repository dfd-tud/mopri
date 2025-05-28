/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Entry } from 'har-format'
import { sha256 } from 'js-sha256'

export const shortenStringForDisplay = (fullString: string, shortenedLength: number) => {
  return fullString.length > shortenedLength - 3
    ? fullString.substring(0, shortenedLength - 3) + '...'
    : fullString
}

export const formatTime = (
  date: Date,
  showSeconds: boolean = true,
  showMiliseconds: boolean = false
) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    // not in types yet but works in Firefox && Chrome
    // https://caniuse.com/mdn-javascript_builtins_intl_datetimeformat_datetimeformat_options_parameter_options_fractionalseconddigits_parameter
    // @ts-ignore
    fractionalSecondDigits: showMiliseconds ? 3 : undefined
  }
  Intl.DateTimeFormat

  // Format the date using toLocaleString
  const formattedDate = date.toLocaleString('de-DE', options)

  return formattedDate
}

export const formatDate = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }

  // Format the date using toLocaleString
  const formattedDate = date.toLocaleString('de-DE', options)

  return formattedDate
}

/**
 * Generates a unique SHA-256 hash identifier for a given request entry.
 *
 * @param {Object} entry - The request entry object containing request and response details.
 * @param {Object} entry.request - The request object.
 * @param {string} entry.request.method - The HTTP method of the request (e.g., GET, POST).
 * @param {string} entry.request.url - The URL of the request.
 * @param {Object} entry.response - The response object.
 * @param {number} entry.response.status - The HTTP status code of the response.
 * @param {string} entry.startedDateTime - The timestamp when the request started.
 * @returns {string} A SHA-256 hash of the unique identifier string.
 */
export const generateRequestIdentifier = (entry: Entry): string => {
  // Extract relevant fields
  const method = entry.request.method
  const url = entry.request.url
  const status = entry.response.status
  const timestamp = entry.startedDateTime

  // Concatenate fields to create a unique string
  const uniqueString = `${method}|${url}|${status}|${timestamp}`

  // Hash the unique string using SHA-256 synchronously
  const hash = sha256(uniqueString)

  return hash
}
