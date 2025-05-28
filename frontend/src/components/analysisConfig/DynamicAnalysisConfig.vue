<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-4">
    <HelpTextAlert>
      In this step, you can configure settings for dynamic network traffic analysis. Specify the app to be analyzed by
      selecting it from previously uploaded applications or by uploading a new one. Additionally, you can enable traffic
      recording and choose the execution platform for the analysis.
    </HelpTextAlert>

    <div class="mb-3 form-check">
      <input id="checkboxTrafficRecording" class="form-check-input" type="checkbox"
        :checked="dynamicConfig.enableTrafficRecording" @change="toggleTrafficRecording" />
      <label class="form-check-label h5" for="checkboxTrafficRecording">
        <i class="fas fa-record-vinyl"></i> Enable Dynamic Analysis
      </label>
    </div>

    <div v-if="dynamicConfig.enableTrafficRecording" class="border p-3 rounded bg-light">
      <section class="mb-2">
        <HelpButtonPopup>
          <template #heading>
            <h5 class="mb-0">Analysis Device</h5>
          </template>
          You can run the app analysis on an <strong>emulator</strong> or a <strong>physical</strong> device. The
          emulator is automatically installed on your host system,
          allowing you to emulate various hardware devices. For the physical device, ensure it is rooted beforehand
          (<a href="https://docs.tweasel.org/usage/setup/#physical-android-phones" target="_blank"
            class="link-primary">rooting
            instructions</a>)
          and connect it to the host computer when prompted during the analysis. It’s crucial that you interact with the
          app to trigger network connections during the analysis. You can stop the analysis at any time, and all
          components installed for the analysis will be removed afterward.
        </HelpButtonPopup>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="platform" id="platformPhysical" value="physical"
            v-model="deviceType">
          <label class="form-check-label" for="platformPhysical">
            <i class="fas fa-mobile-alt"></i> Physical Device
          </label>
        </div>
        <div class="form-check form-check-inline mb-3">
          <input class="form-check-input" type="radio" name="platform" id="platformEmulator" value="emulator"
            v-model="deviceType">
          <label class="form-check-label" for="platformEmulator">
            <i class="fas fa-desktop"></i> Emulator
          </label>
        </div>

        <div class="border-start border-2 ms-4 ps-3" v-if="isEmulatorSelected">
          <EmulatorConfig />
          <EmulatorCreationForm />
        </div>
      </section>
      <section class="mb-3">
        <label for="recordingMethodSelect1" class="form-label h5">Traffic Recording Method</label>
        <div v-for="(tag, index) in trafficRecordingMethodList" :key="tag.id ?? tag.value" class="form-check">
          <input type="radio" class="form-check-input" :id="`${index}-${tag.value}`" :value="tag.value"
            v-model="trafficRecordingMethod" />
          <label :for="`${index}-${tag.value}`" class="form-check-label">
            <HelpButtonPopup><template #heading>
                {{ TrafficRecordingMethodLabels[tag.value as TrafficRecordingMethod] }}
              </template>{{ TrafficRecordingMethodDescriptions[tag.value as TrafficRecordingMethod] }}</HelpButtonPopup>
          </label>
        </div>
      </section>
      <section class="mt-3">
        <h5>Additional Recording Modules</h5>
        <div class="form-check">
          <input id="checkboxScreenRecording" class="form-check-input" type="checkbox"
            :checked="dynamicConfig.trafficRecordingOptions?.enableScreenRecording" @change="toggleScreenRecording" />
          <label class="form-check-label" for="checkboxScreenRecording">
            <i class="fas fa-video"></i> Enable Screen Recording
          </label>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
// compontents
import EmulatorConfig from "./EmulatorConfig.vue";
import EmulatorCreationForm from "./EmulatorCreationForm.vue";
import HelpTextAlert from "../common/HelpTextAlert.vue";
import HelpButtonPopup from "../common/HelpButtonPopup.vue";

import { useUserConfigStore } from "@/stores/userConfigStore.js"
import { storeToRefs } from 'pinia'
import { computed } from "vue";
import { TrafficRecordingMethod } from "@mopri/schema";
import type { SelectTag } from "@/types/ComponentTypes";
import { TrafficRecordingMethodLabels, TrafficRecordingMethodDescriptions } from "../../translations.js";

const analysisConfig = useUserConfigStore();
const { dynamicConfig } = storeToRefs(analysisConfig);
const { toggleTrafficRecording, toggleScreenRecording } = analysisConfig;
const trafficRecordingMethodList: SelectTag<string>[] = Object.keys(TrafficRecordingMethod).filter((item) => {
  return isNaN(Number(item));
}).map(key => ({ value: key }));



// Computed property for selected app package with getter and setter accessing the globalState
const trafficRecordingMethod = computed({
  get: () => dynamicConfig.value.trafficRecordingOptions?.trafficRecordingMethod,
  set: (value) => {
    if (value)
      analysisConfig.setTrafficRecordingMethod(value); // Use the setter function to update the store
  }
});

const deviceType = computed({
  get: () => dynamicConfig.value.deviceType,
  set: (value) => {
    if (value)
      analysisConfig.setDeviceType(value); // Use the setter function to update the store
  }
});

const isEmulatorSelected = computed(() => {
  return deviceType.value === "emulator";
});

</script>
