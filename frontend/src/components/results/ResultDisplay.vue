<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <h1 class="mb-4 text-center">Analysis Report</h1>
  <div class="container text-center mb-4" v-if="analysisId && analysisMeta">
    <ul class="list-group mb-3">
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <strong>Analysis Name</strong>
        <span class="text-muted">{{ analysisMeta?.analysisName }}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <strong>Internal ID</strong>
        <span class="text-muted">{{ analysisId }}</span>
      </li>
      <li v-if="analysisMeta?.createdAt" class="list-group-item d-flex justify-content-between align-items-center">
        <strong>Execution Date</strong>
        <span class="text-muted">{{ new Date(analysisMeta.createdAt).toLocaleString() }}</span>
      </li>
    </ul>
    <div class="row mb-2">
      <div class="col">
        <router-link :to="{ name: 'staticReport', params: { id: analysisId } }" class="btn btn-primary w-100">
          <font-awesome-icon :icon="['fas', 'file-alt']" class="me-2" />
          Generate Report
        </router-link>
      </div>
      <div class="col">
        <a :href="getResultArchiveDownloadURL(analysisId)" class="btn btn-secondary w-100" download>
          <font-awesome-icon :icon="['fas', 'download']" class="me-2" />Download Raw Results
        </a>
      </div>
      <div class="col">
        <button @click="cloneAnalysis(analysisMeta)" class="btn btn-secondary w-100">
          <font-awesome-icon :icon="['fas', 'clone']" class="me-2" />Clone to new Analysis
        </button>
      </div>
      <div class="col">
        <button @click="executeAnalysisDeletion(analysisId)" class="btn btn-danger w-100">
          <font-awesome-icon :icon="['fas', 'trash']" class="me-2" />Delete Analysis
        </button>
      </div>
    </div>
  </div>
  <div class="mb-3" v-if="analysisMeta && analysisId">
    <nav>
      <div class="nav nav-tabs mb-3" id="nav-tab" role="tablist">
        <button class="nav-link active" id="nav-about-tab" data-bs-toggle="tab" data-bs-target="#nav-about"
          type="button" role="tab" aria-controls="nav-about" aria-selected="true">
          <font-awesome-icon class="me-2" :icon="['far', 'file-lines']" />About</button>
        <button class="nav-link" id="nav-summary-tab" data-bs-toggle="tab" data-bs-target="#nav-summary" type="button"
          role="tab" aria-controls="nav-summary" aria-selected="false">
          <font-awesome-icon class="me-2" :icon="['fas', 'list']" />Summary</button>
        <button v-if="showStaticAnalysis" class="nav-link" id="nav-static-permissions-tab" data-bs-toggle="tab"
          data-bs-target="#nav-static-permissions" type="button" role="tab" aria-controls="nav-static-libraries"
          aria-selected="false"><font-awesome-icon class="me-2" :icon="['fas', 'key']" />Permissions</button>
        <button v-if="showStaticAnalysis" class="nav-link" id="nav-static-libraries-tab" data-bs-toggle="tab"
          data-bs-target="#nav-static-libraries" type="button" role="tab" aria-controls="nav-static-libraries"
          aria-selected="false"><font-awesome-icon class="me-2" :icon="['fas', 'eye']" />Tracking Libraries</button>
        <button v-if="showDynamicAnalysis" class="nav-link" id="nav-dynamic-traffic-tab" data-bs-toggle="tab"
          data-bs-target="#nav-dynamic-traffic" type="button" role="tab" aria-controls="nav-dynamic-traffic"
          aria-selected="false"><font-awesome-icon class="me-2" :icon="['fas', 'network-wired']" />Network
          Requests</button>
        <button v-if="showDynamicAnalysis" class="nav-link" id="nav-dynamic-receivers-tab" data-bs-toggle="tab"
          data-bs-target="#nav-dynamic-receivers" type="button" role="tab" aria-controls="nav-dynamic-receivers"
          aria-selected="false"><font-awesome-icon class="me-2" :icon="['fas', 'building']" />Receiving
          Entities</button>
        <button v-if="showDynamicAnalysis" class="nav-link" id="nav-dynamic-data-tab" data-bs-toggle="tab"
          data-bs-target="#nav-dynamic-data" type="button" role="tab" aria-controls="nav-dynamic-data"
          aria-selected="false"><font-awesome-icon class="me-2" :icon="['fas', 'shield-halved']" />
          Sensitive Data</button>
      </div>
    </nav>
    <div class="tab-content" id="nav-tabContent">
      <div class="tab-pane fade show active" id="nav-about" role="tabpanel" aria-labelledby="nav-about-tab">
        <div class="container">
          <AnalysisConfigSummary class="mb-3" :analysis-config="analysisMeta" :shortened="true" />
          <DeviceDataRenderer v-if="showDynamicAnalysis" :analysis-id="analysisId" />
        </div>
      </div>
      <div class="tab-pane fade" id="nav-summary" role="tabpanel" aria-labelledby="nav-summary-tab">
        <AggregatedFiguresRenderer :analysis-id="analysisId" :analysis-meta="analysisMeta" />
      </div>
      <div v-if="showStaticAnalysis" class="tab-pane fade" id="nav-static-permissions" role="tabpanel"
        aria-labelledby="nav-static-permissions-tab">
        <PermissionsRenderer :analysis-id="analysisId" />
      </div>
      <div v-if="showStaticAnalysis" class="tab-pane fade" id="nav-static-libraries" role="tabpanel"
        aria-labelledby="nav-static-libraries-tab">
        <LibraryRenderer :analysis-id="analysisId" :recordings-meta="recordingsList" />
      </div>
      <div v-if="showDynamicAnalysis" class="tab-pane fade" id="nav-dynamic-traffic" role="tabpanel"
        aria-labelledby="nav-dynamic-traffic-tab">
        <NetworkTrafficRenderer :analysis-id="analysisId" :enriched-receivers="enrichedReceivers"
          :device-data="deviceData" />
      </div>
      <div v-if="showDynamicAnalysis" class="tab-pane fade" id="nav-dynamic-receivers" role="tabpanel"
        aria-labelledby="nav-dynamic-receivers-tab">
        <ReceivingEntityRenderer v-if="enrichedReceivers" :enriched-receiving-entities="enrichedReceivers" />
      </div>
      <div v-if="showDynamicAnalysis" class="tab-pane fade" id="nav-dynamic-data" role="tabpanel"
        aria-labelledby="nav-dynamic-data-tab">
        <SensitiveDataRenderer :analysis-id="analysisId" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
// import components
import PermissionsRenderer from './staticAnalysisResults/PermissionsRenderer.vue';
import LibraryRenderer from './staticAnalysisResults/LibraryRenderer.vue';
import ReceivingEntityRenderer from "./dynamicAnalysisResults/ReceivingEntityRenderer.vue";
import NetworkTrafficRenderer from './dynamicAnalysisResults/NetworkTrafficRenderer.vue';
import DeviceDataRenderer from './dynamicAnalysisResults/DeviceDataRenderer.vue';
import AnalysisConfigSummary from '../common/AnalysisConfigSummary.vue';
import AggregatedFiguresRenderer from './AggregatedFiguresRenderer.vue';
import SensitiveDataRenderer from './dynamicAnalysisResults/SensitiveDataRenderer.vue';

// other imports
import { ref, onMounted, computed } from 'vue';
import { fetchAnalysisConfig, fetchAppPackageById, fetchRecordingsMeta, getResultArchiveDownloadURL, fetchAnalysisResult, deleteAnalysis } from '@/services/api';
import type { AnalysisMeta, AppPackageInfo, RecordingMeta, EnrichedReceivingEntity, DeviceData } from '@mopri/schema';
import { RecordingResultTypes } from '@mopri/schema';
import { useRouter } from 'vue-router';
import { useUserConfigStore } from '@/stores/userConfigStore';

const props = defineProps({
  analysisId: String,
})

const enrichedReceivers = ref<EnrichedReceivingEntity[] | undefined>();
const deviceData = ref<DeviceData | undefined>();

const analysisMeta = ref<AnalysisMeta>();
const recordingsList = ref<RecordingMeta>();
const appPackageInfo = ref<AppPackageInfo>();

const showStaticAnalysis = computed(() => analysisMeta.value?.staticConfig.enableExodusModule);
const showDynamicAnalysis = computed(() => analysisMeta.value?.dynamicConfig.enableTrafficRecording);

const loadData = async () => {
  const analysisId = props.analysisId;
  if (analysisId) {
    analysisMeta.value = await fetchAnalysisConfig(props.analysisId);
    updateDocumentTitle(analysisMeta.value.analysisName);
    //recordingsList.value = await fetchRecordingsMeta(props.analysisId);
    if (analysisMeta.value?.appPackageStorageId) {
      appPackageInfo.value = await fetchAppPackageById(analysisMeta.value?.appPackageStorageId);
    }
    if (showDynamicAnalysis.value) {
      try {
        enrichedReceivers.value = await fetchAnalysisResult<EnrichedReceivingEntity[]>(analysisId, "enrichment", RecordingResultTypes.EnrichedEntities);
      } catch (error) {
        //todo
        console.error(error);
      }
      try {
        deviceData.value = await fetchAnalysisResult<DeviceData>(analysisId, "collection", RecordingResultTypes.DeviceData);
      } catch (error) {
        //todo
        console.error(error);
      }
    }
  }
}

onMounted(() => {
  loadData();
});

// Function to update the document title based on the analysisName
const updateDocumentTitle = (analysisName: string) => {
  document.title = `${analysisName} • Interactive Report • mopri`;
};

const router = useRouter();
const executeAnalysisDeletion = async (analysisId: string) => {
  if (confirm('Are you sure you want to delete this analysis?')) {
    try {
      await deleteAnalysis(analysisId);
      router.push({ name: 'analysesCatalog' });
    } catch (e) {
      console.error("Failed to delete analysis with id: " + props.analysisId, e);
    }
  }
};
const cloneAnalysis = (item: AnalysisMeta) => {
  const store = useUserConfigStore()
  store.overwriteStore(item)
  router.push({ name: 'createAnalysis' })
}
</script>
