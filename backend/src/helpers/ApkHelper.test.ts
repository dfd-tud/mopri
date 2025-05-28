// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { promises as fs } from "fs";
import path from "path";
import { ApkHelper } from "./ApkHelper.js";

(async () => {})();

async function reuploadApkFiles() {
  const files = await findApkFiles(
    "/home/emil/Diplomarbeit/development/mopri/backend/uploads/apk_old",
  );
  for (const file of files) {
    await ApkHelper.storeApk(file).then((s) => console.log(s));
  }
}

async function findApkFiles(dir: string): Promise<string[]> {
  let results: string[] = [];

  // Read the contents of the directory
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // If the entry is a directory, recursively search it
      const subDirResults = await findApkFiles(fullPath);
      results = results.concat(subDirResults);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".apk") || entry.name.endsWith(".xapk"))
    ) {
      // If the entry is a file and has the correct extension, add it to results
      results.push(fullPath);
    }
  }

  return results;
}
