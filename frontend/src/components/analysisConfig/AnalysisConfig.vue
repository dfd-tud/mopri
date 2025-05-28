<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <h1 class="mb-4 text-center">Configure new analysis</h1>
  <div class="mb-3">
    <ErrorMessage v-if="validationError" :validation-error="validationError" />
  </div>
  <nav>
    <div class="nav nav-tabs mb-3" id="nav-tab" role="tablist">
      <button class="nav-link active" id="nav-general-tab" data-bs-toggle="tab" data-bs-target="#nav-general"
        type="button" role="tab" aria-controls="nav-general" aria-selected="true">
        <font-awesome-icon :icon="['fas', 'cog']" class="me-2" />General</button>
      <button class="nav-link" id="nav-static-tab" data-bs-toggle="tab" data-bs-target="#nav-static" type="button"
        role="tab" aria-controls="nav-static" aria-selected="false">
        <font-awesome-icon :icon="['fas', 'code']" class="me-2" />Static Analysis</button>
      <button class="nav-link" id="nav-dynamic-tab" data-bs-toggle="tab" data-bs-target="#nav-dynamic" type="button"
        role="tab" aria-controls="nav-dynamic" aria-selected="false">
        <font-awesome-icon :icon="['fas', 'sync']" class="me-2" />Dynamic Analysis</button>
      <button class="nav-link " id="nav-summary-tab" data-bs-toggle="tab" data-bs-target="#nav-summary" type="button"
        role="tab" aria-controls="nav-summary" aria-selected="false">
        <font-awesome-icon :icon="['fas', 'play']" class="me-2" />Start Analysis</button>
    </div>
  </nav>
  <div class="tab-content" id="nav-tabContent">
    <div class="tab-pane fade show active" id="nav-general" role="tabpanel" aria-labelledby="nav-home-tab">
      <GeneralConfig />
    </div>
    <div class="tab-pane fade" id="nav-static" role="tabpanel" aria-labelledby="nav-static-tab">

      <StaticAnalysisConfig />
    </div>
    <div class="tab-pane fade" id="nav-dynamic" role="tabpanel" aria-labelledby="nav-dynamic-tab">
      <DynamicAnalysisConfig />
    </div>
    <div class="tab-pane fade" id="nav-summary" role="tabpanel" aria-labelledby="nav-summary-tab">
      <div class="mb-3">
        <AnalysisConfigSummary :analysis-config="configStore.$state" />

      </div>
      <button :disabled="configStore.isIncomplete" class="btn btn-primary w-100" @click="startAnalysis">
        <font-awesome-icon :icon="['fas', 'play']" class="me-2" />Start Analysis</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import GeneralConfig from './GeneralConfigPart.vue';
import DynamicAnalysisConfig from './DynamicAnalysisConfig.vue';
import StaticAnalysisConfig from './StaticAnalysisConfig.vue';
import ErrorMessage from '../ErrorMessage.vue';
import AnalysisConfigSummary from '../common/AnalysisConfigSummary.vue';
import { useUserConfigStore } from '@/stores/userConfigStore';
import { useRouter } from 'vue-router';
import { HTTPError } from 'ky';
import { ref } from 'vue';
import type { ValidationErrorResponse } from '@/types/Error';
import { useAnalysisLogStore } from '@/stores/analysisLogStore';

const router = useRouter();
const configStore = useUserConfigStore();

const validationError = ref<ValidationErrorResponse | null>(null);

const startAnalysis = async () => {
  const analysisLogStore = useAnalysisLogStore();
  try {
    // start analysis
    await analysisLogStore.startAnalysis();
    // redirect to live-log page for the user to receive status updates during the analysis 
    router.push({ name: 'analysisLog' });
  } catch (e) {
    if (e instanceof HTTPError) {
      console.log(e.response);
      validationError.value = await e.response.json();
    }
  }

}
</script>
