<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-4">
    <section class="mb-4">
      <h2>Aggregated Sensitive Data</h2>
      <table class="table table-striped">
        <thead class="table-dark">
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Data</th>
            <th scope="col">Unique Receiver Count</th>
            <th scope="col">Request Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in aggregatedSensitiveData" :key="index">
            <td>{{ entry.category }}</td>
            <td>{{ entry.data }}</td>
            <td>{{ entry.uniqueReceiverCount }}</td>
            <td>{{ entry.requestCount }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section>
      <h2 class="mb-4">Tweasel Adapter Matches</h2>
      <table class="table table-striped" style="max-width: 100%; overflow-x: auto;">
        <thead class="table-dark">
          <tr>
            <th>Company</th>
            <th>Tracker</th>
            <th>Hosts</th>
            <th>Requests</th>
            <th>Transmitted Data</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(finding, index) in adapterFindings" :key="index">
            <tr>
              <td>{{ finding.adapter.tracker.name }}</td>
              <td>{{ finding.adapter.name }}</td>
              <td class="wrap-sm"> {{ transformHost(finding) }} </td>
              <td>{{ finding.requests.length }}</td>
              <td class="wrap">
                <div v-for="(data, key) in finding.receivedData" :key="key" style="max-width: 600px;" class="wrap mb-2">
                  <span class="fw-bold text-primary me-2">{{ key }}:</span>
                  <span class="text-muted">{{ data.join("; ") }}</span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>
  </div>
</template>
<script setup lang="ts">
import { fetchAnalysisResult } from '@/services/api';
import { type DeviceData, RecordingResultTypes, type SensitiveDataLeakageRecords } from '@mopri/schema';
import type { Cookie, Header, Param } from 'har-format';

import { computed } from 'vue';
import { onMounted, ref } from 'vue';

const props = defineProps<{ analysisId: string }>();

interface AggregatedSensitiveDataEntry {
  category: string;
  data: string;
  uniqueReceiverCount: number;
  requestCount: number;
}

interface AggregatedData {
  [category: string]: { receivers: Set<string>, requestCount: number };
}

const sensitiveDataLeakageRecords = ref<SensitiveDataLeakageRecords>();
const adapterFindings = ref<any[]>();
const deviceData = ref<DeviceData>();


const aggregatedSensitiveData = computed<AggregatedSensitiveDataEntry[]>(() => {
  const data = sensitiveDataLeakageRecords.value;
  if (data && deviceData?.value) {
    const aggregatedData: AggregatedData = {};

    // Iterate through each entry in the data object
    for (const key in data) {
      const entry = data[key];
      const receivers = entry.receiver.hostname + entry.receiver.ip; // Use hostname as a unique identifier
      // Iterate through each data category found
      for (const category of entry.dataCategoriesFound) {
        // Initialize the set for the category if it doesn't exist
        if (!aggregatedData[category]) {
          aggregatedData[category] = { receivers: new Set<string>(), requestCount: 0 };
        }
        // Add the receiver to the set for the category
        aggregatedData[category].receivers.add(receivers);
        aggregatedData[category].requestCount += 1;
      }
    }

    // Prepare the final result with counts of unique receivers for each category
    const result = Object.keys(aggregatedData).map(category => ({
      category,
      data: deviceData.value?.[category as keyof DeviceData] || '', // Provide a default value
      uniqueReceiverCount: aggregatedData[category].receivers.size,
      requestCount: aggregatedData[category].requestCount
    }));
    return result;
  } else return [];
});
const loadData = async () => {
  // get payload enrichments
  try {
    sensitiveDataLeakageRecords.value = await fetchAnalysisResult<SensitiveDataLeakageRecords>(props.analysisId, "enrichment", RecordingResultTypes.SensitiveDataLeakageRecords);
  } catch (error) {
    console.error(error);
  }
  try {
    deviceData.value = await fetchAnalysisResult<DeviceData>(props.analysisId, "collection", RecordingResultTypes.DeviceData);
  } catch (error) {
    console.error(error);
  }
  try {
    adapterFindings.value = await fetchAnalysisResult(props.analysisId, "enrichment", RecordingResultTypes.AdapterMatches);
  } catch (error) {
    console.error(error);
  }
}

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

// not the full type, but enough to make the typescript compiler happy
// need to improve typesetting when properly including adapter matches
// see backend/src/modules/DynamicAnalysis/enrichment/AdapterMatching.ts for full type definition
type AdapterFinding = { requests: { harIndex: number; harEntry?: HarEntry }[] };

const transformHost = (finding: AdapterFinding) => {
  const uniqueHosts = new Set(finding.requests.map(r => r.harEntry?.request.host));
  return Array.from(uniqueHosts).join(', ');
}


onMounted(loadData);
</script>
<style>
/* Additional styling for the table */
.wrap {
  word-wrap: break-word;
  /* Allows long words to be broken and wrapped onto the next line */
  overflow-wrap: break-word;
  /* Ensures that long words will break and wrap */
}
</style>
