<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="mb-3">
    <label for="file">Select existing emulator</label>
    <select v-model="selectedEmulatorName" id="file" class="form-select" aria-label="Default select example">
      <option v-for="emulator in emulatorList" :key="emulator.name" :value="emulator.name">
        {{ emulator.name }}: {{ emulator.basedOn }} - {{ emulator.target }} - {{ emulator.device }}
      </option>
    </select>
  </div>
</template>
<script setup lang="ts">
import { useUserConfigStore } from '@/stores/userConfigStore';
import { fetchExistingEmulators } from '@/services/api';

import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { computed } from 'vue';
import type { AvdInfo } from '@mopri/schema';

const analysisConfig = useUserConfigStore();
const { dynamicConfig } = storeToRefs(analysisConfig);

const emulatorList = ref<AvdInfo[]>([]);
// Computed property for selected app package with getter and setter accessing the globalState
const selectedEmulatorName = computed({
  get: () => dynamicConfig.value.emulatorOptions?.emulatorName,
  set: (value) => {
    if (value) {
      analysisConfig.setEmulatorName(value); // Use the setter function to update the store
    }
  }
});

const loadExistingEmulators = async () => {
  emulatorList.value = await fetchExistingEmulators();
}
loadExistingEmulators();
</script>
