// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { runAndroidDevTool } from "andromatic";
import { AvdInfo } from "@mopri/schema";

export class AVDHelper {
  static async listDevices(): Promise<AvdInfo[]> {
    const proc = runAndroidDevTool("avdmanager", ["list", "avd"]);
    try {
      const { stdout, stderr } = await proc;
      const devices = parseDevices(stdout);
      return devices;
    } catch (e) {
      console.error(e);
      throw new Error("Could not load devices");
    }
  }
}

const parseDevices = (input: string): AvdInfo[] => {
  const devices: AvdInfo[] = [];
  const deviceBlocks = input
    .split("---------\n")
    .filter((block) => block.trim() !== "");

  deviceBlocks.forEach((block) => {
    const lines = block.split("\n").map((line) => line.trim());
    const name =
      lines.find((line) => line.startsWith("Name:"))?.split(": ")[1] || "";
    const device =
      lines.find((line) => line.startsWith("Device:"))?.split(": ")[1] || "";
    const path =
      lines.find((line) => line.startsWith("Path:"))?.split(": ")[1] || "";
    const target =
      lines.find((line) => line.startsWith("Target:"))?.split(": ")[1] || "";
    const size =
      lines.find((line) => line.startsWith("Sdcard:"))?.split(": ")[1] || "";
    const basedOn =
      lines.find((line) => line.startsWith("Based on:"))?.split(": ")[1] || "";

    devices.push({ name, device, path, target, sdCard: size, basedOn });
  });

  return devices;
};

// test
//AVDHelper.listDevices().then(w => console.log(w));
