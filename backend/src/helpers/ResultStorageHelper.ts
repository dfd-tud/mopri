// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import path from "path";
import fs from "node:fs/promises";
import archiver, { Archiver } from "archiver";
import { FileNotFoundError } from "../types/Errors.js";
import {
  AnalysisStage,
  AnalysisMeta,
  AppPackageInfo,
  RecordingMeta,
  RecordingResultTypes,
  RecordingMetaEntry,
} from "@mopri/schema";
import { ApkHelper } from "../helpers/ApkHelper.js";
import { ensureDirectoryExists, isErrnoException } from "../utils.js";

const RESULT_DIR = path.join(path.resolve(), "/storage/analyses");
export interface IResultStorageHelper {
  analysisId: string;
  getAnalysisMeta(): Promise<AnalysisMeta>;
  ensureResultDirsExist(): Promise<void>;
  getStorageDir(stage?: AnalysisStage): string;
  getStorageFilePath(filename: string, stage?: AnalysisStage): string;
  saveResultToJsonFile(
    result: object,
    filename: string,
    jsonFileType: "json" | "har",
    stage?: AnalysisStage,
  ): Promise<string>;
  readResultFromJsonFile<outputType>(
    filename: string,
    stage?: AnalysisStage,
  ): Promise<outputType>;
  loadResultRegister(): Promise<void>;
  registerResult(
    stage: AnalysisStage,
    moduleName: string,
    recordingType: RecordingResultTypes,
    analysisType: "static" | "dynamic",
    file: string,
    startCaptureTime?: number,
    errorMsg?: string | undefined,
  ): void;
  getRegisteredResults(): ResultRegister;
  getRegisteredResult(
    stage: AnalysisStage,
    recordingType: RecordingResultTypes,
  ): RecordingMetaEntry | undefined;
  loadResult<T>(
    stage: AnalysisStage,
    recordingType: RecordingResultTypes,
  ): Promise<T>;

  storeRecordingMeta(): Promise<void>;
}

export type ResultRegister = {
  [S in AnalysisStage]: RecordingMeta;
};

export class ResultStorageHelper implements IResultStorageHelper {
  private registeredResults: ResultRegister = {
    collection: {},
    enrichment: {},
  };

  constructor(public analysisId: string) {}

  /**
   * Ensures that the necessary result directories exist for storing analysis results
   * for the current analysisId.
   *
   * This method creates the directories for both the "collection" and "enrichment"
   * stages if they do not already exist. It uses the `getStorageDir` method to
   * determine the appropriate paths.
   *
   * @throws {Error} Throws an error if the directories cannot be created due to
   *                 permission issues or other filesystem errors.
   */
  async ensureResultDirsExist(): Promise<void> {
    try {
      await fs.mkdir(this.getStorageDir("collection"), { recursive: true });
      await fs.mkdir(this.getStorageDir("enrichment"), { recursive: true });
    } catch (error) {
      console.error(`Failed to create result directories`, error);
      throw new Error(`Could not create result directories: ${error.message}`);
    }
  }
  /**
   * Checks if the analysis directory exists for the current analysis ID.
   *
   * @returns {Promise<boolean>} A promise that resolves to true if the analysis
   *                             directory exists, and false otherwise.
   */
  async checkAnalysisExists(): Promise<boolean> {
    const resultStoragePath = this.getStorageDir();
    try {
      const stats = await fs.stat(resultStoragePath);
      return stats.isDirectory(); // Return true if it's a directory
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // Directory does not exist
          return false;
        }
        // Handle other potential errors (e.g., permission issues)
        console.error(`Error checking analysis directory: ${error.message}`);
        throw new Error(
          `Unable to check existence of analysis directory: ${error.message}`,
        );
      } else {
        // If the error is not an instance of Error, handle it generically
        console.error(
          "An unknown error occurred while checking the analysis directory.",
        );
        throw new Error(
          "An unknown error occurred while checking the analysis directory.",
        );
      }
    }
  }

  /**
   * Retrieves the storage directory path for a specific stage of analysis.
   *
   * This method constructs a directory path based on a base result directory
   * and the current analysis ID. If a stage is provided, it will be included
   * in the directory path.
   *
   * @param stage - An optional value of type `Stage` representing the stage of
   *                analysis. If provided, it will be included in the directory path.
   *
   * @returns A string representing the full path of the storage directory.
   */
  getStorageDir(stage?: AnalysisStage): string {
    const basePath = path.join(RESULT_DIR, this.analysisId);
    return stage ? path.join(basePath, stage) : basePath;
  }

  getStorageFilePath(filename: string, stage?: AnalysisStage): string {
    return path.join(this.getStorageDir(stage), filename);
  }

  async deleteAnalysisResults() {
    const storageDir = this.getStorageDir();
    try {
      await fs.rm(storageDir, { recursive: true });
    } catch (e) {
      if (isErrnoException(e) && e.code == "ENOENT") {
        throw new FileNotFoundError("Could not delete analysis - not found");
      } else {
        throw new Error("Failed to delete analyis", { cause: e });
      }
    }
  }

  async saveResultToJsonFile(
    result: object,
    filename: string,
    jsonFileType: "json" | "har",
    stage?: AnalysisStage,
  ): Promise<string> {
    const file = filename + "." + jsonFileType;
    const filePath = this.getStorageFilePath(file, stage);
    const content = JSON.stringify(result);
    await fs.writeFile(filePath, content);
    return file;
  }
  async readResultFromJsonFile<outputType>(
    filename: string,
    stage?: AnalysisStage,
  ): Promise<outputType> {
    const filePath = this.getStorageFilePath(filename, stage);
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as outputType;
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new FileNotFoundError(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async getAnalysisMeta(): Promise<AnalysisMeta> {
    return this.readResultFromJsonFile<AnalysisMeta>("UserConfig.json");
  }

  static async getAnalysisList(): Promise<AnalysisMeta[]> {
    const analyisIds: string[] = (
      await fs.readdir(RESULT_DIR, { withFileTypes: true })
    )
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    return Promise.all(
      analyisIds.map(async (id) => {
        const storageHelper = new ResultStorageHelper(id);
        try {
          return await storageHelper.getAnalysisMeta();
        } catch (error) {
          return {
            analysisId: id,
            appPackageStorageId: "",
            createdAt: new Date(),
            note: "Missing user config",
            appPackageName: "",
            analysisName: "",
            staticConfig: { enableExodusModule: false },
            dynamicConfig: { enableTrafficRecording: false },
          };
        }
      }),
    );
  }
  async loadResultRegister(): Promise<void> {
    const resultRegister: ResultRegister =
      await this.readResultFromJsonFile<ResultRegister>("recordings.json");
    this.registeredResults = resultRegister;
  }
  registerResult(
    stage: AnalysisStage,
    moduleName: string,
    recordingType: RecordingResultTypes,
    analysisType: "static" | "dynamic",
    file: string,
    startCaptureTime?: number,
    errorMsg?: string | undefined,
  ): void {
    this.registeredResults[stage][recordingType] = {
      moduleName,
      analysisType,
      startCaptureTime,
      file,
      errorMsg,
    };
  }
  getRegisteredResults(): ResultRegister {
    return this.registeredResults;
  }
  getRegisteredResult(
    stage: AnalysisStage,
    recordingType: RecordingResultTypes,
  ): RecordingMetaEntry | undefined {
    return this.registeredResults[stage][recordingType];
  }
  async storeRecordingMeta() {
    try {
      await this.saveResultToJsonFile(
        this.registeredResults,
        "recordings",
        "json",
      );
    } catch {
      throw new Error("Failed to store recording meta");
    }
  }

  /**
   * Generates a zip archive containing the results from the storage directory.
   *
   * This method reads all files and directories within the result storage directory,
   * and adds them to a zip archive. If a directory is encountered, its contents are
   * added recursively. Additionally, it attempts to read APK file information and
   * includes the APK file and its metadata in the archive.
   *
   * @returns {Promise<Archiver>} A promise that resolves to an Archiver instance
   *                              containing the zipped contents of the result directory,
   *                              including any APK files and their metadata.
   *
   * @throws {Error} Throws an error if there is an issue reading the directory or
   *                 if any file operations fail. The error message will provide
   *                 details about the failure.
   *
   * @example
   * const archive = await getResultArchive();
   * archive.pipe(response); // Pipe the archive to a response stream.
   *
   * @note Ensure that the directory specified by `getStorageDir()` exists and is accessible.
   *       If the directory is empty, the resulting zip file will also be empty.
   *       The method attempts to read APK file information; if this fails, the APK file
   *       will not be included in the archive, but the process will continue without
   *       throwing an error.
   */
  async getResultArchive(): Promise<Archiver> {
    if (!(await this.checkAnalysisExists())) {
      throw new FileNotFoundError("Result directory does not exists.");
    }
    const archive = archiver("zip", { zlib: { level: 9 } });

    try {
      const resultStorageDir = this.getStorageDir();
      const files = await fs.readdir(resultStorageDir);

      for (const file of files) {
        const filePath = path.join(resultStorageDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // If it's a directory, recursively zip its contents
          archive.directory(filePath, file);
        } else {
          // If it's a file, add it to the archive
          archive.file(filePath, { name: file });
        }
      }
      try {
        const analysisMeta: AnalysisMeta = await this.getAnalysisMeta();
        const apkHelper = new ApkHelper(analysisMeta.appPackageStorageId);
        const apkFilePath = await apkHelper.getPackageFilePath();
        const apkInfo: AppPackageInfo = await apkHelper.getAppPackageInfo();
        // add original apk file
        archive.file(apkFilePath, { name: path.basename(apkFilePath) });
        // add details about the apk
        archive.append(JSON.stringify(apkInfo), { name: "APKInfo.json" });
      } catch (err) {
        console.error("Failed to add apk to result zip: " + err);
      }
    } catch (err) {
      throw new Error(`Error reading directory: ${err.message}`);
    }
    archive.finalize();
    return archive;
  }

  async loadResult<T>(
    stage: AnalysisStage,
    resultType: RecordingResultTypes,
  ): Promise<T> {
    const resultFile = this.getRegisteredResult("collection", resultType)?.file;
    if (!resultFile) {
      throw new FileNotFoundError(
        `Could not find any registered file of type ${resultType}`,
      );
    }
    return await this.readResultFromJsonFile<T>(resultFile, stage);
  }

  static async ensureStorageDir(): Promise<void> {
    await ensureDirectoryExists(RESULT_DIR);
  }

  static getResultDir() {
    return RESULT_DIR;
  }
}

// test getAnalysisList()
// ResultStorageHelper.getAnalysisList().then(l => console.log(l));
