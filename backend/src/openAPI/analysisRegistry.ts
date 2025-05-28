/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { RecordingResultTypes } from "@mopri/schema";
import { analysisMetaSchema } from "@mopri/schema";
import { z } from "zod";

const analysisRegistry = new OpenAPIRegistry();

analysisRegistry.registerPath({
  method: "get",
  path: "/analysis/",
  description: "Get a list of configs of all finished analysis",
  summary: "Get list of analysis configs",
  responses: {
    200: {
      description: "A list of analysis meta information of past analysis",
      content: {
        "application/json": { schema: analysisMetaSchema.array() },
      },
    },
  },
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "get",
  path: "/analysis/{analysisId}",
  description: "Get the configuration file for a certain analysisId",
  summary: "Get analysis config",
  request: {
    params: z.object({ analysisId: z.string() }),
  },
  responses: {
    200: {
      description: "Config for a certain analysis",
      content: {
        "application/json": { schema: analysisMetaSchema },
      },
    },
  },
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "get",
  path: "/analysis/download/{analysisId}",
  description:
    "Retrieves the result directory for a specific analysis identified by the provided analysis ID. The results are packaged into a ZIP archive for easy download.",
  summary: "Download analysis results as a ZIP archive",
  request: {
    params: z.object({
      analysisId: z
        .string()
        .describe(
          "The unique identifier for the analysis whose results are to be downloaded.",
        ),
    }),
  },
  responses: {
    200: {
      description:
        "A ZIP file containing the complete analysis results, including any associated APK files used during the analysis. This file can be extracted to access the results in their original format.",
      content: {
        "application/zip": {
          schema: {
            type: "string",
            format: "binary",
          },
          examples: {
            example1: {
              summary: "Example ZIP file name",
              value: "results_12ba80bd824ad867.zip", // Example ZIP filename
            },
          },
        },
      },
    },
    400: {
      description:
        "Bad Request: The request is missing the required parameter 'analysisId'.",
    },
    404: {
      description: "Not Found: No analysis with the specified ID was found.",
    },
    500: {
      description:
        "Internal Server Error: An error occurred while processing the request. This may be due to issues with zipping the directory or other server-side problems.",
    },
  },
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "get",
  path: "/analysis/result/{analysisId}/{stage}/{resultType}",
  request: {
    params: z.object({
      analysisId: z
        .string()
        .describe(
          "The unique identifier for the analysis whose results are to be downloaded.",
        ),
      stage: z
        .enum(["collection", "enrichment"])
        .describe("The recording stage."),
      resultType: z.string().describe("The type of the result to retrieve."),
    }),
  },
  responses: {
    200: {
      description: "Successful response containing the result data.",
    },
    400: {
      description: "Bad Request - Missing or invalid parameters.",
    },
    404: {
      description: "Not Found - The specified result type does not exist.",
    },
    500: {
      description: "Internal Server Error - Failed to read the result file.",
    },
  },
  summary: "Get Analysis Result",
  description:
    "Fetches the result of an analysis based on the analysis ID, stage, and result type. Returns the corresponding recording or a static URL if applicable.",
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "post",
  path: "/analysis/",
  description: "Start a new analysis based on the provided analysis config",
  summary: "Start a new analysis",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: analysisMetaSchema } },
    },
  },
  responses: {
    200: {
      description: "A list of analysis configs of past analysis",
      content: {
        "application/json": { schema: analysisMetaSchema.array() },
      },
    },
  },
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "delete",
  path: "/analysis/{id}",
  description: "Delete analysis by id",
  summary: "Delete analysis by id",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Successfully deleted analysis.",
      content: {
        "application/json": {
          schema: z.object({
            message: z
              .string()
              .openapi({
                example:
                  "Successfully deteled analysis with id 1833a472e350c3a2",
              }),
          }),
        },
      },
    },
    404: {
      description: "Could not find analysis",
      content: {
        "application/json": {
          schema: z.object({
            message: z
              .string()
              .openapi({
                example: "Could not find analysis with id 1833a472e350c3a2",
              }),
          }),
        },
      },
    },
    500: {
      description: "Unkown error",
      content: {
        "application/json": {
          schema: z.object({
            message: z
              .string()
              .openapi({
                example:
                  "Failed to delete analysis with id 1833a472e350c3a2 due to an unkown error - please try again.",
              }),
          }),
        },
      },
    },
  },
  tags: ["analysis"],
});

analysisRegistry.registerPath({
  method: "delete",
  path: "/analysis/runningRecordings/{id}",
  description: "Stop running dynamiy analysis",
  summary: "Stop currently running analysis",
  responses: {
    200: {
      description: "Status stopped",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().openapi({ example: "stopped" }),
          }),
        },
      },
    },
    400: {
      description: "Status stopped",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().openapi({ example: "not running" }),
          }),
        },
      },
    },
  },
  tags: ["analysis"],
});

export default analysisRegistry;
