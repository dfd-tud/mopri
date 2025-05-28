<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="mb-3">
    <router-link :to="{ name: 'result', params: { id: analysisId } }" class="btn btn-secondary w-20 d-print-none">
      <font-awesome-icon :icon="['fas', 'arrow-left']" class="me-2" />
      Back to Interactive Report
    </router-link>
  </div>
  <div v-if="analysisMeta" class="print-report" ref="report" id="element-to-convert">
    <section class="sheet">
      <div class="print-logo">
        <img src="@/assets/logo.svg" />
      </div>
      <h1 class="mb-4">Application Analysis Report</h1>
      <p>
        On <b>{{ formatDate(new Date(analysisMeta.createdAt)) }}</b>, the app <b>{{ analysisMeta.appPackageStorageId
          }}</b> was analyzed using the privacy tool <b>mopri</b>. The findings from this analysis are detailed in the
        following report.
      </p>
      <h2>Table Of Contents</h2>
      <!-- Table of Contents -->
      <ol class="list-group list-group-numbered mb-4">
        <li class="list-group-item"><a href="#about-analysis" class="text-decoration-none">About the Analysis</a></li>
        <li class="list-group-item"><a href="#app-details" class="text-decoration-none">App Details</a></li>
        <li class="list-group-item"><a href="#aggregated-figures" class="text-decoration-none">Aggregated Figures</a>
        </li>
        <li v-if="showStaticResults" class="list-group-item"><a href="#permissions"
            class="text-decoration-none">Permissions</a></li>
        <li v-if="showStaticResults" class="list-group-item"><a href="#tracking-libraries"
            class="text-decoration-none">Tracking Libraries</a></li>
        <li v-if="showDynamicResults" class="list-group-item"><a href="#sensitive-values"
            class="text-decoration-none">Sensitive Values Detected
            in
            Network Requests</a></li>
        <li v-if="showDynamicResults" class="list-group-item"><a href="#receiving-entities"
            class="text-decoration-none">Receiving Entities of
            Network Requests</a></li>
        <li v-if="showDynamicResults" class="list-group-item"><a href="#appendix"
            class="text-decoration-none">Appendix</a></li>
      </ol>
    </section>
    <section class="sheet" id="about-analysis">
      <AnalysisConfigSummary :analysis-config="analysisMeta" :shortened="true" />
      <div v-if="trafficRecordingMethodInfo" class="mt-3">
        <h4 class="mb-2">About the Recording Method</h4>
        <h5 class="text-muted mb-3">
          {{ trafficRecordingMethodInfo.label }} </h5>
        {{ trafficRecordingMethodInfo.description }}
      </div>
    </section>
    <section class="sheet" id="aggregated-figures">
      <AggregatedFiguresRenderer :analysis-id="analysisId" :analysis-meta="analysisMeta" />
    </section>
    <section v-if="showStaticResults" class="sheet" id="permissions">
      <PermissionsRenderer :analysis-id="analysisId" />
    </section>
    <section v-if="showStaticResults" class="sheet" id="tracking-libraries">
      <LibraryRenderer :analysis-id="analysisId" />
    </section>
    <section v-if="receivingEntities" class="sheet" id="receiving-entities">
      <ReceivingEntityRenderer :enriched-receiving-entities="receivingEntities" />
    </section>
    <section class="sheet" id="sensitive-values">
      <h2>Sensitive Values Detected in Network Requests</h2>
      <SensitiveDataRenderer :analysis-id="analysisId" />
    </section>
    <section class="sheet" id="traffic-log">
      <h2>Full traffic log</h2>
      <NetworkTrafficRenderer :analysis-id="analysisId" :enriched-receivers="receivingEntities" :print="true" />
    </section>
    <section id="appendix">
      <h2>Appendix</h2>
      In the appended zip archive you find all raw analysis data as well as the original app installation package used.
      The archive has the checksum (SHA256) <b>placeholder</b>. You can use this checksum to validate the authenticity
      of
      the archive.
    </section>
  </div>

  <!-- Fixed Print Button -->
  <button class="d-print-none btn btn-secondary fixed-bottom mx-auto" @click="printPage">
    <font-awesome-icon class="me-2" :icon="['fa', 'print']" /> Print Report
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchAnalysisConfig, fetchAnalysisResult } from '@/services/api';
import { type EnrichedReceivingEntity, type AnalysisMeta, RecordingResultTypes } from '@mopri/schema';
import { formatDate } from '@/utils'

import AggregatedFiguresRenderer from '@/components/results/AggregatedFiguresRenderer.vue';
import LibraryRenderer from '@/components/results/staticAnalysisResults/LibraryRenderer.vue';
import PermissionsRenderer from '@/components/results/staticAnalysisResults/PermissionsRenderer.vue';
import AnalysisConfigSummary from '@/components/common/AnalysisConfigSummary.vue';
import ReceivingEntityRenderer from '../dynamicAnalysisResults/ReceivingEntityRenderer.vue';
import SensitiveDataRenderer from '../dynamicAnalysisResults/SensitiveDataRenderer.vue';
import NetworkTrafficRenderer from '../dynamicAnalysisResults/NetworkTrafficRenderer.vue';
import { computed } from 'vue';
import { TrafficRecordingMethodDescriptions, TrafficRecordingMethodLabels } from '@/translations';

const props = defineProps<{ analysisId: string }>();
const analysisMeta = ref<AnalysisMeta>();
const receivingEntities = ref<EnrichedReceivingEntity[]>();


interface TrafficRecordingMethodInfo {
  label: string;
  description: string;
}
const trafficRecordingMethodInfo = computed<TrafficRecordingMethodInfo | undefined>(() => {
  const trafficRecordingMethod = analysisMeta.value?.dynamicConfig.trafficRecordingOptions?.trafficRecordingMethod;
  // Early return if no recording method is found
  if (!trafficRecordingMethod) {
    return undefined;
  }

  const label = TrafficRecordingMethodLabels[trafficRecordingMethod] || 'Unknown Method';
  const description = TrafficRecordingMethodDescriptions[trafficRecordingMethod] || 'No description available.';

  return {
    label,
    description,
  };
});

const showStaticResults = computed(() => analysisMeta.value?.staticConfig.enableExodusModule ?? false);
const showDynamicResults = computed(() => analysisMeta.value?.dynamicConfig.enableTrafficRecording ?? false);
const loadData = async () => {
  analysisMeta.value = await fetchAnalysisConfig(props.analysisId);
  receivingEntities.value = await fetchAnalysisResult<EnrichedReceivingEntity[]>(props.analysisId, "enrichment", RecordingResultTypes.EnrichedEntities)
}
onMounted(loadData);
const printPage = () => {
  print();
}
</script>
<style scoped>
.fixed-bottom {
  position: fixed;
  bottom: 20px;
  right: 0;
  left: 0;
  width: 300px;
}
</style>
