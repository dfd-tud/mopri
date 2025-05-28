// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import path from "path";
import fs from "fs/promises";
import { FileNotFoundError } from "../types/Errors.js";

export default class DependencyHelper {
  /**
   * Retrieves the full path to a specified dependency file for a given module.
   *
   * This asynchronous function constructs the path to a dependency file by combining
   * the current working directory, a fixed "deps" directory, the module name, and the
   * dependency filename. It then checks if the file exists at the constructed path.
   * If the file does not exist, it throws a `FileNotFoundError`.
   *
   * @param moduleName - The name of the module where the dependency is located.
   *                     This should be the name of the directory under the "deps"
   *                     directory in the current working directory that contains the
   *                     dependency file. Ensure that the module name is correctly
   *                     specified to avoid path resolution issues.
   *
   * @param depFilename - The name of the dependency file to locate within the module.
   *                      This should include the file extension (e.g., `.py`, `.xml`).
   *                      Be cautious with the filename to ensure it matches exactly,
   *                      as the function performs a direct file system check.
   *
   * @returns A promise that resolves to the full path of the dependency file if it
   *          exists. The path is constructed using `path.join`, ensuring that it
   *          is correctly formatted for the operating system.
   *
   * @throws {FileNotFoundError} If the dependency file does not exist at the
   *                              constructed path. The error message will include
   *                              the full path that was attempted, which can be useful
   *                              for debugging.
   *
   * @example
   * // Example usage of getDependencyPath
   * const path = await getDependencyPath('myModule', 'myDependency.xml');
   * console.log(path); // Outputs the full path to 'myDependency.xml' in 'myModule'
   *
   * @note The function assumes that the "deps" directory exists in the current working
   *       directory. If the directory structure is different, the function may not
   *       work as intended. Ensure that the directory structure is set up correctly
   *       before calling this function.
   */
  static async getDependencyPath(
    moduleName: string,
    depFilename: string,
  ): Promise<string> {
    const dependencyPath = path.join(process.cwd(), "dependencies", moduleName, depFilename);
    try {
      await fs.stat(dependencyPath);
    } catch (error) {
      if (error instanceof Error) {
        const fsError = error as NodeJS.ErrnoException;
        if (fsError.code === "ENOENT") {
          throw new FileNotFoundError(
            `Could not find dependency at path: ${dependencyPath}. ` +
              `Module: ${moduleName}, Dependency: ${depFilename}`,
          );
        }
      }
    }
    return dependencyPath;
  }
}
