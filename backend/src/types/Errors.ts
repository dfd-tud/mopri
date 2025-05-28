/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export class NoDeviceConnectedError extends Error {
  constructor(message: string = "No device connected - please connect device") {
    super(message);
    this.name = NoDeviceConnectedError.name;
  }
}
export class TooManyDevicesConnectedError extends Error {
  constructor(
    message: string = "Multiple devices connected - please disconnect all but one",
  ) {
    super(message);
    this.name = TooManyDevicesConnectedError.name;
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = FileNotFoundError.name;
  }
}

export class UploadedAppPackageAlreadyExists extends Error {
  constructor() {
    super("The uploaded app package already exists");
  }
}
