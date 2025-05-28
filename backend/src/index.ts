/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ensureSdkmanager, getAndroidDevToolPath, updatePackages } from "andromatic";
import app from "./app.js";
import { wait } from "./utils.js";
import { ApkHelper } from "./helpers/ApkHelper.js";
import { ResultStorageHelper } from "./helpers/ResultStorageHelper.js";
import { execa } from "execa";

// Greeter function
const greeter = () => {
  console.log("####################");
  console.log("# Welcome to mopri #");
  console.log("####################");
};

(async () => {
  greeter();
  // introduced wait to be sure startup message is printed in case updatePackages() blocks the process
  await wait(1000);
  /*
   * #####################
   * # Pre-Startup Tasks #
   * #####################
   */
  // ensure storage dirs
  try {
    console.log("Ensure storage directories...");
    await ResultStorageHelper.ensureStorageDir();
    await ApkHelper.ensureStorageDir();
  } catch (e) {
    console.error(
      "Failed to ensure directories for storing results and uploads.",
      e,
    );
    // end mopri
    return;
  }

  // set env vars
  try {
    console.log("Setup env vars...");
    const paths = await ensureSdkmanager();
    // Set the environment variables
    for (const [key, value] of Object.entries(paths.env)) {
      process.env[key] = value;
    }
    console.log("ANDROID_HOME:", process.env.ANDROID_HOME);
    console.log("JAVA_HOME:", process.env.JAVA_HOME);
    // add build-tools to $PATH -> required for exodus to be able to use dexdump 
    // since it is added to the beginning of $PATH this should also overwrite locals
    const dexdumpPath = await getAndroidDevToolPath('dexdump');
    const buildToolsPath = dexdumpPath.substring(0, dexdumpPath.lastIndexOf("/")); 
    process.env.PATH = `${buildToolsPath}:${process.env.PATH}`;
    console.log("PATH:", process.env.PATH);
  } catch (e) {
    console.error("Failed to setup env vars");
  }

  //update sdkmanager (andromatic)
  try {
    console.log("Update Android SDK packages...");
    await updatePackages();
    console.log("Successfully updated Android SDK packages");
  } catch {
    console.error("Failed to update Android SDK packages on startup");
  }

  /*
   * ########################
   * # start express server #
   * ########################
   */
  const port = 3000;
  const server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });

  /*
   * ##########################
   * # gracefully stop server #
   * ##########################
   */
  // https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed!");
    });
  });
})();
