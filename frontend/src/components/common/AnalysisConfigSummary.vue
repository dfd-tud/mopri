<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="mt-4">
    <div class="mb-3">
      <h3>
        Analysis Configuration
      </h3>
      <p v-if="!shortened" class="text-muted fst-italic">Check if everything is correctly configured before you start
        the analysis.</p>
    </div>
    <div class="border rounded p-3 bg-light">
      <div class="mb-3">
        <strong>
          <font-awesome-icon :icon="['fas', 'search']" class="me-2" />
          Name:
        </strong>
        <span class="ms-2">{{ analysisConfig.analysisName }}</span>
        <span v-if="!analysisConfig.analysisName" class="text-danger mt-1">
          <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="me-1" />
          <span>Please provide a name for the analysis.</span>
        </span>
      </div>

      <div class="mb-3">
        <strong>
          <font-awesome-icon :icon="['fas', 'sticky-note']" class="me-2" />
          Note:
        </strong>
        <span :class="{ 'fst-italic': !analysisConfig.note }" class="ms-2">{{ analysisConfig.note || 'Not provided'
          }}</span>
      </div>

      <div class="mb-3">
        <strong>
          <font-awesome-icon :icon="['fas', 'box']" class="me-2" />
          App Install Package
        </strong>
        <div v-if="packageInfo">
          <div class="border-start border-2 ms-4 me-2 ps-2">
            <div>
              App Name:
              <strong>
                <span class="ms-2 fw-bold">{{ packageInfo.label }}</span>
              </strong>
            </div>
            <div>
              Package Name:
              <strong>
                <span class="ms-2 fw-bold">{{ packageInfo.package }}</span>
              </strong>
            </div>
            <div>
              Version:
              <strong>
                <span class="ms-2 fw-bold">{{ packageInfo.version }}</span>
              </strong>
            </div>
            <div>
              Type:
              <strong>
                <span class="ms-2 fw-bold">{{ packageInfo.type }}</span>
              </strong>
            </div>
            <!-- Displaying Hashes -->
            <div>
              Hashes (original {{ packageInfo.type }} file):
              <div class="word-wrap border-start border-2 ms-4 me-2 ps-2">
                <div>
                  MD5:
                  <strong>
                    <span class="ms-2 fw-bold">{{ packageInfo.hashes.md5 }}</span>
                  </strong>
                </div>
                <div>
                  SHA1:
                  <strong>
                    <span class="ms-2 fw-bold">{{ packageInfo.hashes.sha1 }}</span>
                  </strong>
                </div>
                <div>
                  SHA256:
                  <strong>
                    <span class="ms-2 fw-bold">{{ packageInfo.hashes.sha256 }}</span>
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <font-awesome-icon :icon="['fas', 'code']" class="me-2" />
        <strong>
          Static Analysis:
        </strong>
        <EnabledDisabledIcon :is-enabled="exodusAnalysisEnabled" />
      </div>

      <div>
        <strong>
          <font-awesome-icon :icon="['fas', 'sync']" class="me-2" />
          Dynamic Analysis:
        </strong>
        <EnabledDisabledIcon :is-enabled="trafficAnalysisEnabled" />

        <div v-if="trafficAnalysisEnabled">
          <div class="border-start border-2 ms-4 me-2 ps-2">
            <div>
              Device Type:
              <span class="ms-2 fw-bold">{{ analysisConfig.dynamicConfig.deviceType }}</span>
            </div>
            <div v-if="isTargetEmulator">
              Android Virtual Device (AVD) Name:
              <span class="ms-2 fw-bold">{{ analysisConfig.dynamicConfig.emulatorOptions?.emulatorName }}</span>
              <span v-if="!analysisConfig.dynamicConfig.emulatorOptions?.emulatorName" class="text-danger mt-1">
                <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="me-1" />
                <span>Please select an emulator.</span>
              </span>
            </div>

            <div v-if="analysisConfig.dynamicConfig.trafficRecordingOptions?.trafficRecordingMethod">
              <HelpButtonPopup>
                <template #heading>
                  <span class="me-2">Recording Method:</span>
                  <span class="fw-bold">
                    {{
                      TrafficRecordingMethodLabels[analysisConfig.dynamicConfig.trafficRecordingOptions.trafficRecordingMethod]
                    }}
                  </span>
                </template>
                {{
                  TrafficRecordingMethodDescriptions[analysisConfig.dynamicConfig.trafficRecordingOptions.trafficRecordingMethod]
                }}
              </HelpButtonPopup>
            </div>

            <div>
              Record Screen:
              <EnabledDisabledIcon
                :is-enabled="analysisConfig.dynamicConfig.trafficRecordingOptions?.enableScreenRecording ?? false" />
            </div>
            <div>
              Capture Device Data:
              <EnabledDisabledIcon
                :is-enabled="analysisConfig.dynamicConfig.trafficRecordingOptions?.enableDeviceDataCapture ?? false" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchAppPackageById } from '@/services/api';
import EnabledDisabledIcon from './EnabledDisabledIcon.vue';
import type { AppPackageInfo, AnalysisConfig, AnalysisMeta } from '@mopri/schema';
import { ref } from 'vue';
import { watch } from 'vue';
import { computed } from 'vue';
import { TrafficRecordingMethodDescriptions, TrafficRecordingMethodLabels } from '@/translations';
import HelpButtonPopup from './HelpButtonPopup.vue';

const props = defineProps<{ analysisConfig: AnalysisConfig | AnalysisMeta, shortened?: boolean }>();

const exodusAnalysisEnabled = computed(() => props.analysisConfig.staticConfig.enableExodusModule);
const trafficAnalysisEnabled = computed(() => props.analysisConfig.dynamicConfig.enableTrafficRecording);
const isTargetEmulator = computed(() => props.analysisConfig.dynamicConfig.deviceType === "emulator");

const packageInfo = ref<AppPackageInfo>();

const loadPackageInfo = async (packageId: string) => {
  try {
    packageInfo.value = await fetchAppPackageById(packageId);
  } catch (error) {
    console.error("Failed to load package info");
  }
};
watch(
  () => props.analysisConfig.appPackageStorageId,
  async (newVal) => {
    if (newVal) {
      await loadPackageInfo(newVal);
    } else {
      packageInfo.value = undefined; // Reset package info if no ID is provided
    }
  },
  { immediate: true }
);


</script>
