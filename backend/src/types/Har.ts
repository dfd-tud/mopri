/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Request } from "har-format";

// Extend the Entry interface
export interface Content {
  mimeType: string;
  text: string;
  size: number;
  encoding: string;
}

/**
 * PCAPngUtilsRequest extends the standard HAR Request interface to include additional properties
 * for handling non-printable request data as used by pcapng-utils.
 *
 * Reference: https://github.com/PiRogueToolSuite/pcapng-utils/blob/main/pcapng_utils/payload.py#L61
 *
 * - `_content`: Optional field for storing non-printable request data, following the httptoolkit standard.
 * - `_requestBodyStatus`: Optional status of the request body, e.g., 'discarded:not-representable'
 *   for cases where the body cannot be captured.
 *
 * Note: `size` and `encoding` are not supported for `postData` in HAR, hence the use of `_content`.
 */
export interface PCAPngUtilsRequest extends Request {
  _content?: Content;
  _requestBodyStatus?: string; // Made optional
}
