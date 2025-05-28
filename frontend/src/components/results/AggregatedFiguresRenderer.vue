<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-3 aggregated-figures">
    <div v-if="aggregatedExodusResults" class="row">
      <div class="col-md-12">
        <h2 class="font-weight-bold">Static Analysis</h2>
      </div>
      <!-- Permissions -->
      <div class="col-md-6">
        <FigureCard title="Permissions" :number="aggregatedExodusResults.permissions" :icon="['fas', 'key']">
          <!-- Progress Bar for dangerous permissions -->
          <ProgressBar title="Dangerous Permissions" :value="aggregatedExodusResults.dangerousPermissions"
            :max="aggregatedExodusResults.permissions" />
          <!-- Progress Bar for special permissions -->
          <ProgressBar title="Special Permissions" :value="aggregatedExodusResults.specialPermissions"
            :max="aggregatedExodusResults.permissions" />
          <!-- Progress Bar for custom permissions -->
          <ProgressBar title="Custom Permissions" :value="aggregatedExodusResults.customPermissions"
            :max="aggregatedExodusResults.permissions" />
        </FigureCard>
      </div>
      <!-- Tracking Libaries -->
      <div class="col-md-6">
        <FigureCard title="Tracking Libraries" :number="aggregatedExodusResults.trackerLibraries"
          :icon="['fas', 'eye']" />
      </div>
    </div>
    <div v-if="aggregatedTraffic" class="row">
      <div class="col-md-12">
        <h2 class="font-weight-bold">Network Traffic Analysis</h2>
      </div>
      <!-- Requests Group -->
      <div class="col-md-12">
        <FigureCard :title="translateKey('totalRequests')" :number="aggregatedTraffic.totalRequests"
          :icon="['fas', 'arrow-right-arrow-left']">
          <!-- Progress Bar for Non-EU Requests -->
          <ProgressBar :title="translateKey('nonEURequests')" :value="aggregatedTraffic.nonEURequests"
            :max="aggregatedTraffic.totalRequests" />
          <!-- Progress Bar for Requests to Receivers on Blocklist -->
          <ProgressBar :title="translateKey('requestsToReceiversOnBlocklist')"
            :value="aggregatedTraffic.requestsToReceiversOnBlocklist" :max="aggregatedTraffic.totalRequests" />
          <!-- Progress Bar for Requests with Sensitive Data -->
          <ProgressBar :title="translateKey('requestsWithSensitiveData')"
            :value="aggregatedTraffic.requestsWithSensitiveData" :max="aggregatedTraffic.totalRequests" />
        </FigureCard>
      </div>
      <!-- Receivers Group -->
      <div class="col-md-3">
        <FigureCard :title="translateKey('hostnames')" :number="aggregatedTraffic.hostnames" :icon="['fas', 'server']">
          <ProgressBar :title="translateKey('receiversOnBlocklist')" :value="aggregatedTraffic.receiversOnBlocklist"
            :max="aggregatedTraffic.hostnames" />
        </FigureCard>
      </div>
      <div class="col-md-3">
        <FigureCard :title="translateKey('ips')" :number="aggregatedTraffic.ips" :icon="['fas', 'network-wired']" />
      </div>
      <div class="col-md-3">
        <FigureCard :title="translateKey('hostingProviders')" :number="aggregatedTraffic.hostingProviders"
          :icon="['fas', 'cloud']" />
      </div>
      <div class="col-md-3">
        <FigureCard :title="translateKey('organisations')" :number="aggregatedTraffic.organisations"
          :icon="['fas', 'building']" />
      </div>
      <!-- Locations Group -->
      <div class="col-md-3">
        <FigureCard :title="translateKey('countries')" :number="aggregatedTraffic.countries"
          :icon="['fas', 'earth-americas']">
          <ProgressBar :title="translateKey('nonEuCountries')" :value="aggregatedTraffic.nonEuCountries"
            :max="aggregatedTraffic.countries" />
        </FigureCard>
      </div>
      <!-- Payloads Group -->
      <div class="col-md-3">
        <FigureCard :title="translateKey('sensitiveValuesTransmitted')"
          :number="aggregatedTraffic.sensitiveValuesTransmitted" :icon="['fas', 'fa-shield-alt']" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { type AggregatedStaticAnalysisResults, RecordingResultTypes, type AggregatedFigures, type AnalysisMeta } from '@mopri/schema';
import { AggregatedFiguresLabels } from '@/translations';
import { fetchAnalysisResult } from '@/services/api';

import FigureCard from '@/components/common/FigureCard.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';

const props = defineProps<{
  analysisId: string;
  analysisMeta: AnalysisMeta;
}>();


const translateKey = (key: keyof AggregatedFigures) => {
  return AggregatedFiguresLabels[key];
};

const aggregatedExodusResults = ref<AggregatedStaticAnalysisResults | undefined>();
const aggregatedTraffic = ref<AggregatedFigures | undefined>();


const loadData = async () => {
  if (props.analysisMeta.dynamicConfig.enableTrafficRecording) {
    try {
      aggregatedTraffic.value = await fetchAnalysisResult<AggregatedFigures>(props.analysisId, "enrichment", RecordingResultTypes.AggregatedFiguresTrafficAnalysis)
    } catch (e) {
      console.error(e);
    }
  }
  if (props.analysisMeta.staticConfig.enableExodusModule) {
    try {
      aggregatedExodusResults.value = await fetchAnalysisResult<AggregatedStaticAnalysisResults>(props.analysisId, "enrichment", RecordingResultTypes.AggregatedFiguresStaticAnalysis);
    } catch (e) {
      console.error(e);
    }
  }
}
onMounted(loadData);
</script>

<style scoped></style>
