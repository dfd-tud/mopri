// SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import INetworkTrafficEnrichmentManager from "./INetworkTrafficEnrichmentManager.js";
import { ILogger } from "../../../logger/ILogger.js";
import { IResultStorageHelper } from "../../../helpers/ResultStorageHelper.js";

import { getHostnameFromUrl } from "../../../utils.js";
import { process as processHar } from "trackhar";

import ky, { HTTPError } from "ky";
import crypto from "crypto";
import { execa } from "execa";

import type { Entry, Har } from "har-format";
import type {
  EnrichedReceivingEntity,
  BlocklistEntry,
  IpWhoisInfo,
  DomainWhoisInfo,
  DeviceData,
  AggregatedFigures,
  ReceivingEntityWithAggregation,
  SensitiveDataLeakageRecords,
} from "@mopri/schema";
import { RecordingResultTypes } from "@mopri/schema";
import { prepareTraffic } from "./AdapterMatching.js";

interface IPWhoisResponse {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  is_eu: boolean;
  longitude: number;
  latitude: number;
  flag: {
    emoji: string;
  };
  connection: {
    asn: number;
    org: string;
    isp: string;
    domain: string;
  };
}

interface PCAPEntities extends ReceivingEntityWithAggregation {
  correspondingHosts: string[];
}

interface AggregatedFiguresReceivers {
  countries: number;
  nonEuCountries: number;
  hostingProviders: number;
  organisations: number;
  hostnames: number;
  ips: number;
  nonEURequests: number;
  totalRequests: number;
  receiversOnBlocklist: number;
  requestsToReceiversOnBlocklist: number;
}

interface AggregatedFiguresPayloads {
  requestsWithSensitiveData: number;
  sensitiveValuesTransmitted: number;
}

interface TsharkPacket {
  _index: string;
  _type: string;
  _score: number | null;
  _source: {
    layers: {
      "tls.handshake.extensions_server_name": string[];
      "ip.dst_host": string[];
      "frame.time": string[];
      "frame.number": string[];
      "ip.dst": string[];
    };
  };
}

export class NetworkTrafficEnrichmentManager
  implements INetworkTrafficEnrichmentManager
{
  name = NetworkTrafficEnrichmentManager.name;
  private har?: Har;
  private deviceData?: DeviceData;
  constructor(
    public storageHelper: IResultStorageHelper,
    public logger: ILogger,
  ) {}

  async getRecordedHarFile(): Promise<Har> {
    // Return early if HAR file is already loaded
    if (this.har) return this.har;
    const harFilename = this.storageHelper.getRegisteredResult(
      "collection",
      RecordingResultTypes.NetworkHar,
    )?.file;
    // throw error if no recorded har file in recordings
    if (!harFilename) throw new Error("No har file recorded");
    // load har file
    try {
      this.har = await this.storageHelper.readResultFromJsonFile<Har>(
        harFilename,
        "collection",
      );
      return this.har;
    } catch (e) {
      throw new Error("Failed to load har file for enrichment.", {
        cause: e,
      });
    }
  }

  async getDeviceData(): Promise<DeviceData> {
    // Return early if HAR file is already loaded
    if (this.deviceData) return this.deviceData;
    const deviceDataFilename = this.storageHelper.getRegisteredResult(
      "collection",
      RecordingResultTypes.DeviceData,
    )?.file;
    // throw error if no recorded har file in recordings
    if (!deviceDataFilename) throw new Error("No device data recorded");
    // load har file
    try {
      this.deviceData =
        await this.storageHelper.readResultFromJsonFile<DeviceData>(
          deviceDataFilename,
          "collection",
        );
      return this.deviceData;
    } catch (e) {
      throw new Error("Failed to load device data file for enrichment.", {
        cause: e,
      });
    }
  }

/**
 * Retrieves hostnames and their corresponding IP addresses from a PCAPng file.
 * This function uses the `tshark` command-line tool to extract TLS handshake information,
 * specifically the Server Name Indication (SNI) and destination IP addresses.
 *
 * @param pcapngFile - The path to the PCAPng file from which to extract receiving entities.
 *
 * @returns A promise that resolves to an array of `PCAPEntities` objects, each representing
 *          a unique hostname and its associated data.
 *
 * @remarks
 * The function performs the following steps:
 * - Executes the `tshark` command with specific arguments to read the PCAPng file and extract relevant data.
 * - Parses the output from `tshark` into a structured format.
 * - Aggregates the results to count the number of requests for each hostname and IP address combination.
 * - Constructs an array of `PCAPEntities` that includes the hostname, IP address, request count,
 *   and a flag indicating that these entities were extracted because no traffic could be decrypted for them.
 *   This flag is set to `true` for all entities, reflecting that the traffic was encrypted and not available
 *   for inspection when later matched with domains extracted from the HAR file.
 * - Additionally, each `PCAPEntities` object includes a list of corresponding hostnames that were observed
 *   in the packets associated with the original hostname, providing context for which domains the original
 *   domain was redirected to or interacted with during the session.
 *
 * Note: This function requires the `tshark` tool to be installed and accessible in the system's PATH.
 * If the command fails or the output cannot be parsed, an error will be logged, and an empty array will be returned.
 */
  async retrieveHostnamesFromPCAPng(
    pcapngFile: string,
  ): Promise<PCAPEntities[]> {
    try {
      const args = [
        "-r",
        pcapngFile, // Read from the specified PCAP file
        "-Y",
        "tls.handshake.extensions_server_name", // Display filter
        "-T",
        "json", // Output format
        "-e",
        "tls.handshake.extensions_server_name", // Excrat SNI
        "-e",
        "ip.dst_host", // Extract destination domain
        "-e",
        "ip.dst", // Extract destination ip
        "-e",
        "frame.time", // Extract frame start time
        "-e",
        "frame.number", // Extract frame number
      ];
      // execute tshark command
      const { stdout } = await execa("tshark", args, {
        cwd: this.storageHelper.getStorageDir("collection"),
      });
      // todo add safe parsing with zod
      const tsharkOutput = JSON.parse(stdout) as TsharkPacket[];

      const tsharkOutputFile = await this.storageHelper.saveResultToJsonFile(
        tsharkOutput,
        RecordingResultTypes.NetworkPCAPTLSExtract,
        "json",
        "collection",
      );
      // register result
      this.storageHelper.registerResult(
        "collection",
        this.name,
        RecordingResultTypes.NetworkPCAPTLSExtract,
        "dynamic",
        tsharkOutputFile,
      );
      const hostCountMap = tsharkOutput.reduce(
        (acc, packet) => {
          const domain =
            packet._source.layers["tls.handshake.extensions_server_name"][0]; // Get the first host
          const ip = packet._source.layers["ip.dst"][0];
          if (domain && ip) {
            const key = `${domain}|${ip}`;
            acc[key] = (acc[key] || 0) + 1; // Increment count
          }
          return acc;
        },
        {} as { [key: string]: number },
      );

      // Convert the map to an array of HostCount objects
      const map: ReceivingEntityWithAggregation[] = Object.entries(
        hostCountMap,
      ).map(([host, count]) => ({
        hostname: host.split("|")[0] ?? "",
        ip: host.split("|")[1] ?? "",
        requestCount: count,
        hasOnlyEncryptedTraffic: true,
      }));

      // add hostnames that belong to the original domain (e.g. cdns)
      return map.map(
        (m): PCAPEntities => ({
          ...m,
          correspondingHosts: Array.from(
            new Set(
              tsharkOutput
                // get a list of packets that have the hostname as their SNI
                .filter((t) =>
                  t._source.layers[
                    "tls.handshake.extensions_server_name"
                  ].includes(m.hostname),
                )
                // filter out unkown destionation hosts
                .filter((t) => t._source.layers["ip.dst_host"])
                // add all other hosts to the list of corresponding hosts
                // fallback '' should never be the case, since we already filtered for all unkown values -> just for the compiler
                .map((t) => t._source.layers["ip.dst_host"]?.[0] ?? ""),
            ),
          ),
        }),
      );
    } catch (e) {
      this.logger.error(this.name, "Failed to retrieve hostnames from pcapng");
      console.error(e);
      return [];
    }
  }

  async enrichReceivers() {
    const har = await this.getRecordedHarFile();
    const entityMap = new Map<string, ReceivingEntityWithAggregation>();

    // Iterate over the HAR entries to create and aggregate receiving entities
    // ues map as temporary data structure for improved lookups
    har.log.entries.forEach((e) => {
      const hostname = getHostnameFromUrl(e.request.url);
      const ip = e.serverIPAddress;
      const key = `${hostname}-${ip}`; // Create a unique key for each entity

      if (entityMap.has(key)) {
        // If the entity already exists, increment the request count
        entityMap.get(key).requestCount += 1;
      } else {
        // If it's a new entity, initialize it with a count of 1
        entityMap.set(key, {
          hostname,
          ip,
          requestCount: 1,
          hasOnlyEncryptedTraffic: false,
        });
      }
    });

    // Convert the Map back to an array of receiving entities for further processing and storing
    const receivingEntities: ReceivingEntityWithAggregation[] = Array.from(
      entityMap.values(),
    );

    let requestsNotDecrypted: number = 0;
    let numHostsWithFailedDecryption: number = 0;
    const pcapngFile = this.storageHelper.getRegisteredResult(
      "collection",
      RecordingResultTypes.NetworkPCAPng,
    )?.file;
    if (pcapngFile) {
      const hostsWithFailedDecryption = new Set<string>();
      const listFromPcap = await this.retrieveHostnamesFromPCAPng(pcapngFile);
      // Function to add entries from list1 to list2 if they don't already exist in list2
      listFromPcap.forEach((entry) => {
        const exists = receivingEntities.some(
          (item) => item.ip === entry.ip && item.hostname === entry.hostname,
        );
        if (!exists) {
          receivingEntities.push(entry);
          hostsWithFailedDecryption.add(entry.hostname);
          requestsNotDecrypted += entry.requestCount;
        }
      });
      numHostsWithFailedDecryption = Array(hostsWithFailedDecryption).length;
    }

    // download blocklists for ip classification
    console.time("downloadBlocklists");
    const blockListMap = await downloadBlocklists();
    console.timeEnd("downloadBlocklists");

    // download domainMap for getting the org behind a domain
    const domainMap = await downloadTrackerRadarDomainMap();

    let requestsToReceiversOnBlocklist = 0;
    let totalRequests = 0;
    let nonEURequests = 0;
    const uniqueCountries: Set<string> = new Set();
    const uniqueOrganisations: Set<string> = new Set();
    const uniqueHostingProviders: Set<string> = new Set();
    const uniqueHostnames: Set<string> = new Set();
    const uniqueHostnamesOnBlocklist: Set<string> = new Set();
    const uniqueIPs: Set<string> = new Set();
    const uniqueNonEUCountries = new Set();

    // enrich
    console.time("enrich receivers");
    const enrichedReceivingEntities: EnrichedReceivingEntity[] =
      await Promise.all(
        receivingEntities.map(
          async (
            e: ReceivingEntityWithAggregation,
          ): Promise<EnrichedReceivingEntity> => {
            // check blocklists
            console.time("checkBlockList");
            const blockListHits = checkDomainIsBlocked(
              e.hostname,
              blockListMap,
            );
            console.timeEnd("checkBlockList");

            let ipWhoisInfo: IpWhoisInfo = {};
            if (e.ip) {
              try {
                ipWhoisInfo = await loadIpWhoisInfo(e.ip);
              } catch (error) {
                console.error(error);
                this.logger.error(
                  this.name,
                  "Failed to get ipWhoisInfo for ip " + e.ip,
                );
              }
            }

            // get domain whois information
            let domainWhoisInfo: DomainWhoisInfo = {};
            // Function to check if any key from the JSON object is included in the hostname
            function findKeyForHostnameInDomainMap(
              hostname: string,
            ): string | undefined {
              return Object.keys(domainMap).find((key) =>
                hostname.includes(key),
              );
            }
            const tldInDomainMap = findKeyForHostnameInDomainMap(e.hostname);
            if (tldInDomainMap)
              domainWhoisInfo = {
                orgName: domainMap[tldInDomainMap]?.entityName,
              };

            // store values for aggregation
            if (blockListHits.length > 0) {
              uniqueHostnamesOnBlocklist.add(e.hostname);
              requestsToReceiversOnBlocklist += e.requestCount;
            }
            if (ipWhoisInfo.location?.country)
              uniqueCountries.add(ipWhoisInfo.location.country);
            if (ipWhoisInfo.org?.orgName)
              uniqueHostingProviders.add(ipWhoisInfo.org.orgName);
            if (domainWhoisInfo.orgName)
              uniqueOrganisations.add(domainWhoisInfo.orgName);
            if (e.ip) uniqueIPs.add(e.ip);
            if (!ipWhoisInfo.location?.isEU) {
              nonEURequests += e.requestCount;
              if (ipWhoisInfo.location?.country)
                uniqueNonEUCountries.add(ipWhoisInfo.location.country);
            }
            uniqueHostnames.add(e.hostname);
            totalRequests += e.requestCount;
            // if loading fails just return the entity to avoid missing entities
            return { ...e, domainWhoisInfo, ipWhoisInfo, blockListHits };
          },
        ),
      );
    console.timeEnd("enrich receivers");
    try {
      const outputFile = await this.storageHelper.saveResultToJsonFile(
        enrichedReceivingEntities,
        RecordingResultTypes.EnrichedEntities,
        "json",
        "enrichment",
      );
      this.storageHelper.registerResult(
        "enrichment",
        this.name,
        RecordingResultTypes.EnrichedEntities,
        "dynamic",
        outputFile,
      );
    } catch (error) {
      this.logger.error(
        this.name,
        "Failed to save enrichedReceivingEntities to result file: " + error,
      );
    }

    const aggregation: AggregatedFiguresReceivers = {
      countries: uniqueCountries.size,
      nonEuCountries: uniqueNonEUCountries.size,
      hostingProviders: uniqueHostingProviders.size,
      organisations: uniqueOrganisations.size,
      hostnames: uniqueHostnames.size,
      ips: uniqueIPs.size,
      nonEURequests,
      totalRequests,
      requestsToReceiversOnBlocklist,
      receiversOnBlocklist: uniqueHostnamesOnBlocklist.size,
    };

    return aggregation;
  }

  async enrichPayloads(): Promise<AggregatedFiguresPayloads> {
    const harFile = await this.getRecordedHarFile();
    const deviceData = await this.getDeviceData();

    let numberOfRequestsWithSensitiveData = 0;
    let sensitiveValuesSet = new Set<string>();
    const sensitiveDataFound: SensitiveDataLeakageRecords = {};
    console.time("enrichPayloads");
    harFile.log.entries.forEach((entry) => {
      //find sensitive data
      const matches = this.scanForSensitiveData(entry, deviceData);
      if (matches.length > 0) {
        numberOfRequestsWithSensitiveData++;
        matches.forEach((m) => sensitiveValuesSet.add(m));
        sensitiveDataFound[generateRequestIdentifier(entry)] = {
          dataCategoriesFound: matches,
          receiver: {
            hostname: getHostnameFromUrl(entry.request.url),
            ip: entry.serverIPAddress,
          },
        };
      }
    });
    console.timeEnd("enrichPayloads");

    // store enrichment results
    const outputFile = await this.storageHelper.saveResultToJsonFile(
      sensitiveDataFound,
      RecordingResultTypes.SensitiveDataLeakageRecords,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.SensitiveDataLeakageRecords,
      "dynamic",
      outputFile,
    );
    return {
      requestsWithSensitiveData: numberOfRequestsWithSensitiveData,
      sensitiveValuesTransmitted: sensitiveValuesSet.size,
    };
  }

  async matchAdapters() {
    const harFile = await this.getRecordedHarFile();
    const data = await processHar(harFile);
    const processedData = prepareTraffic(harFile, data);
    const outputFile = await this.storageHelper.saveResultToJsonFile(
      processedData.findings,
      RecordingResultTypes.AdapterMatches,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.AdapterMatches,
      "dynamic",
      outputFile,
    );
  }

  async execute() {
    await this.matchAdapters();
    const aggregatedReceivers = await this.enrichReceivers();
    const aggregatedPayloads = await this.enrichPayloads();
    const aggregatedFigures: AggregatedFigures = {
      ...aggregatedReceivers,
      ...aggregatedPayloads,
    };
    RecordingResultTypes.AggregatedFiguresTrafficAnalysis;
    const outputFile = await this.storageHelper.saveResultToJsonFile(
      aggregatedFigures,
      RecordingResultTypes.AggregatedFiguresTrafficAnalysis,
      "json",
      "enrichment",
    );
    this.storageHelper.registerResult(
      "enrichment",
      this.name,
      RecordingResultTypes.AggregatedFiguresTrafficAnalysis,
      "dynamic",
      outputFile,
    );
  }

  scanForSensitiveData(requestEntry: Entry, deviceData: DeviceData): string[] {
    const request = requestEntry.request;
    // retrieve new object with uninteresting keys removed
    const { osVersion: a, runTarget: b, ...deviceDataOfInterest } = deviceData;

    // get device values as array for comparisson
    const deviceValues: string[] = Object.values(deviceDataOfInterest).filter(
      (value) => value !== undefined,
    ) as string[];

    // Create a mapping of device values to their keys
    const deviceValueToKeyMap: { [key: string]: string } = {};
    // Populate the mapping with defined values from deviceData
    for (const [key, value] of Object.entries(deviceDataOfInterest)) {
      if (value !== undefined) {
        deviceValueToKeyMap[value] = key;
      }
    }
    const matchingValues: string[] = [];
    switch (request.method) {
      case "GET":
        // Check each value in the queryString list
        request.queryString.forEach((q) => {
          // Find deviceData values included in the current queryString
          const matches = deviceValues.filter((deviceValue) =>
            q.value.includes(deviceValue),
          );
          matchingValues.push(...matches);
        });
        break;
      case "POST":
        // Create a regex pattern from the device values
        const pattern = deviceValues.map((value) => `(${value})`).join("|");
        const regex = new RegExp(pattern, "gi"); // 'g' for global, 'i' for case insensitive

        // Find matches in the text
        let matches;
        // sometimes params array is empty
        if (request.postData?.params && request.postData.params.length != 0) {
          matches = JSON.stringify(request.postData.params).match(regex);
        } else if (request.postData?.text) {
          matches = request.postData.text.match(regex);
        }
        if (matches) matchingValues.push(...matches);
        break;
    }
    // Return unique keys for matched values
    return Array.from(
      new Set(
        matchingValues
          .map((match) => deviceValueToKeyMap[match])
          .filter((key): key is string => key !== undefined),
      ),
    );
  }
}

const generateRequestIdentifier = (entry: Entry) => {
  // Extract relevant fields
  const method = entry.request.method;
  const url = entry.request.url;
  const status = entry.response.status;
  const timestamp = entry.startedDateTime;

  // Concatenate fields to create a unique string
  const uniqueString = `${method}|${url}|${status}|${timestamp}`;

  // Hash the unique string using SHA-256
  const hash = crypto.createHash("sha256").update(uniqueString).digest("hex");

  return hash;
};

// List of blocklist URLs with their categories
const BLOCKLISTS: BlocklistEntry[] = [
  {
    url: "https://easylist.to/easylist/easylist.txt",
    name: "easylist",
    author: "easylist",
  },
  {
    url: "https://easylist.to/easylist/easyprivacy.txt",
    name: "easylistprivacy",
    author: "easylist",
  },
  {
    url: "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblock&showintro=0",
    name: "yoyo hostlist",
    author: "yoyo",
  },
  {
    url: "https://www.github.developerdan.com/hosts/lists/tracking-aggressive-extended.txt",
    name: "tracking aggressive",
    author: "Daniel White",
  },
];

// Define the structure for the blocklist map
type BlocklistMap = Map<BlocklistEntry, Set<string>>;

// Function to download and parse blocklists
async function downloadBlocklists() {
  // todo: add caching
  const blocklistMap: BlocklistMap = new Map();
  for (const blockListEntry of BLOCKLISTS) {
    try {
      const response = await ky.get(blockListEntry.url).text();
      const lines = response.split("\n");

      const filteredBlockList = new Set<string>();
      // filter out comments in downloaded blocklist
      lines.forEach((line) => {
        line = line.trim();
        // Ignore comments and empty lines
        if (line && !line.startsWith("!") && !line.startsWith("#")) {
          filteredBlockList.add(line);
        }
      });
      blocklistMap.set(blockListEntry, filteredBlockList);
    } catch (error) {
      console.error(
        `Error downloading blocklist from ${blockListEntry.url}:`,
        error,
      );
    }
  }
  return blocklistMap;
}

// Function to classify domains
function checkDomainIsBlocked(
  domain: string,
  blocklistMap: BlocklistMap,
): BlocklistEntry[] {
  const blockListHits: BlocklistEntry[] = [];

  for (const [blockListEntry, blockedDomains] of blocklistMap) {
    if (
      Array.from(blockedDomains).some(
        (blockedDomain) =>
          // check wether tld from blockedDomains is included in checked domain
          domain.includes(blockedDomain) ||
          // or domain is part of any blocklist entry
          blockedDomain.includes(domain),
      )
    ) {
      blockListHits.push(blockListEntry);
    }
  }
  return blockListHits;
}

async function loadIpWhoisInfo(ip: string): Promise<IpWhoisInfo> {
  // load ipWhoisInformation
  const ipWhoIsUrl = `https://ipwho.is/${ip}?fields=ip,connection,country,country_code,city,is_eu,latitude,longitude,flag.emoji`;
  try {
    const response = await ky.get(ipWhoIsUrl).json<IPWhoisResponse>();
    return {
      org: {
        orgName: response.connection.org,
        domain: response.connection.domain,
        asn: response.connection.asn,
      },
      location: {
        country: response?.country,
        countryCode: response.country_code,
        latitude: response.latitude,
        longitude: response.longitude,
        flagEmoji: response.flag.emoji,
        isEU: response.is_eu,
      },
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      throw Error(
        `Failed loading ipWhois info for ip ${ip} with http error code ${error.response.status} and response ${error.response.text}`,
      );
    }
    throw Error("An error occurred loading ipWhois info.", { cause: error });
  }
}

interface TrackerRadarDomainEntry {
  entityName: string;
  aliases: string[];
  displayName: string;
}
interface TrackerRadarDomainMap {
  [domain: string]: TrackerRadarDomainEntry;
}
async function downloadTrackerRadarDomainMap() {
  const domainMapUrl =
    "https://raw.githubusercontent.com/duckduckgo/tracker-radar/refs/heads/main/build-data/generated/domain_map.json";
  const response = await ky.get(domainMapUrl).json<TrackerRadarDomainMap>();
  return response;
}
