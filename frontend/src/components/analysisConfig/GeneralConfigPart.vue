<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <HelpTextAlert>
    In this step, you can provide meta information about the analysis to help you distinguish it from other analyses in
    the future. Most importantly, you need to specify the app that should be analyzed. You can either select an app from
    the list of previously uploaded applications or upload a new one for analysis.
  </HelpTextAlert>
  <div class="mb-3">
    <label class="form-control-label" for="analysisName">
      <font-awesome-icon :icon="['fas', 'search']" />
      Analysis Name
    </label>
    <input type="text" class="form-control" id="analysisName" v-model="analysisNameInput" />
  </div>
  <div class="mb-3">
    <label class="form-control-label" for="note">
      <font-awesome-icon :icon="['fas', 'sticky-note']" />
      Additional Notes (optional)
    </label>
    <input type="text" class="form-control" id="note" v-model="analysisNote" />
  </div>
  <AppPackage />
</template>
<script setup lang="ts">
import HelpTextAlert from '../common/HelpTextAlert.vue';
import { useUserConfigStore } from '@/stores/userConfigStore';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

// components 
import AppPackage from './AppPackageSelect.vue';

const analysisConfig = useUserConfigStore();
const { analysisName, note } = storeToRefs(analysisConfig);

const analysisNameInput = computed({
  get: () => analysisName.value,
  set: (value) => {
    analysisConfig.setAnalysisName(value); // Use the setter function to update the store
  }
});
const analysisNote = computed({
  get: () => note.value,
  set: (value) => {
    analysisConfig.setNote(value); // Use the setter function to update the store
  }
});
</script>
