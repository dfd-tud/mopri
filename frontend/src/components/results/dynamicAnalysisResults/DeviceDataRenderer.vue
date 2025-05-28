<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div v-if="deviceData">
    <HeadingWithAnker id="section-device">Analysis Device Specifications</HeadingWithAnker>
    <ParameterList :list="mappedDeviceData" />
  </div>
</template>
<script setup lang="ts">
import HeadingWithAnker from '@/components/common/HeadingWithAnker.vue';
import ParameterList from '@/components/common/ParameterList.vue';

import { fetchAnalysisResult } from '@/services/api';
import { RecordingResultTypes, type DeviceData } from '@mopri/schema';
import { DeviceDataLabels } from '@/translations';
import { ref, computed, onMounted } from 'vue';

const props = defineProps<{ analysisId: string }>();

const deviceData = ref<DeviceData | undefined>();
const mappedDeviceData = computed(() => {
  if (deviceData.value)
    return Object.entries(deviceData.value).map(([key, value]) => ({ name: DeviceDataLabels[key as keyof typeof DeviceDataLabels], value }))
  else return [];
}
);



const loadData = async () => {
  const analysisId = props.analysisId;
  try {
    deviceData.value = await fetchAnalysisResult<DeviceData>(analysisId, "collection", RecordingResultTypes.DeviceData);
  } catch (error) {
    //todo
    console.error(error);
  }
}
onMounted(loadData);
</script>
