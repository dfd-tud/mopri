// SPDX-FileCopyrightText: © 2023 Benjamin Altpeter
// SPDX-FileCopyrightText: © 2023 Lorenz Sieben
// SPDX-FileCopyrightText: © 2025 Cornell Ziepel
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Har, Content, Header, Cookie, Param } from "har-format";
import { Adapter, adapters, type processRequest } from "trackhar";

// type HarEntry was taken from https://github.com/tweaselORG/TrackHAR
type HarEntry = {
  startTime: Date;

  request: {
    httpVersion: string;
    method: string;

    scheme: "http" | "https";
    host: string;
    port: string;
    path: string;
    pathWithoutQuery: string;
    queryParams: { name: string; value: string }[];

    headers?: Header[];
    cookies?: Cookie[];

    content?: string | Param[];
  };

  response: {
    status: number;
    statusText: string;
    httpVersion: string;

    headers?: Header[];
    cookies?: Cookie[];

    content?: string;
  };
};

// function unhar was taken from https://github.com/tweaselORG/TrackHAR with slight changes for decoding the content
const unhar = (har: Har): HarEntry[] =>
  har.log.entries.map((e) => {
    const url = new URL(e.request.url);

    const decodeContent = (content?: Content) => {
      if (!content?.text) return undefined;

      if (content.encoding) {
        if (content.encoding === "base64")
          return Buffer.from(content.text, "base64").toString("binary");

        throw new Error(`Unsupported content encoding: ${content.encoding}`);
      }

      return content.text;
    };

    return {
      startTime: new Date(e.startedDateTime),

      request: {
        httpVersion: e.request.httpVersion,
        method: e.request.method,

        scheme: url.protocol.replace(":", "") as "http" | "https",
        host: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        pathWithoutQuery: url.pathname,
        queryParams: [...url.searchParams.entries()].map(([name, value]) => ({
          name,
          value,
        })),

        headers: e.request.headers,
        cookies: e.request.cookies,

        content:
          e.request.postData?.params && e.request.postData?.params.length > 0
            ? e.request.postData?.params
            : e.request.postData?.text,
      },

      response: {
        status: e.response.status,
        statusText: e.response.statusText,
        httpVersion: e.response.httpVersion,

        headers: e.response.headers,
        cookies: e.response.cookies,

        content: decodeContent(e.response.content),
      },
    };
  });

export const prepareTraffic = (
  har: Har,
  trackHarResult: ReturnType<typeof processRequest>[],
) => {
  const harEntries = unhar(har);
  const filteredTrackHarResult = trackHarResult
    .map((transmissions, harIndex) =>
      !transmissions || transmissions.length === 0
        ? null
        : {
            harIndex,
            harEntry: harEntries[harIndex],
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            adapter: transmissions[0]!.adapter,
            transmissions,
          },
    )
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const findings = filteredTrackHarResult.reduce<
    Record<
      string,
      {
        adapter: Adapter;
        requests: typeof filteredTrackHarResult;
        receivedData: Record<string, Array<string>>;
      }
    >
  >((acc, req) => {
    if (req) {
      if (!acc[req.adapter]) {
        const adapter = adapters.find(
          (a) => a.tracker.slug + "/" + a.slug === req.adapter,
        );
        if (!adapter) throw new Error(`Unknown adapter: ${req.adapter}`);
        acc[req.adapter] = {
          adapter,
          requests: [],
          receivedData: {},
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc[req.adapter]!.requests.push(req);

      for (const transmission of req.transmissions) {
        const property = String(transmission.property);

        if (!acc[req.adapter]?.receivedData[property]) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          acc[req.adapter]!.receivedData[property] = [];
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        acc[req.adapter]!.receivedData[property] = [
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ...new Set([
            ...acc[req.adapter]!.receivedData[property]!,
            transmission.value,
          ]),
        ];
      }
    }

    return acc;
  }, {});

  return { harEntries, filteredTrackHarResult, findings };
};
