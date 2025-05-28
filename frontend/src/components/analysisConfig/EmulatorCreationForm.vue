<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="mb-3">
    <button class="btn btn-outline-primary btn-sm" @click="openModal">
      <font-awesome-icon :icon="['fas', 'plus']" />
      Create Emulator
    </button>

    <BootstrapModal modal-id="createEmulatorModal" title="Create Emulator" submit-button-text="Add Emulator"
      @submit="handleSubmit" @close="closeModal" :is-open="isModalOpen" :is-loading="isLoadingAvdCreation">
      <form @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label for="name" class="form-label">Name</label>
          <input type="text" id="name" v-model="formData.name" class="form-control" required />
        </div>

        <SelectFormField id="api-level" label="Android version" :tags="androidVersions"
          v-model.number="formData.apiLevel" />

        <SelectFormField id="variant" label="Variant"
          :tags="[{ value: 'default', displayText: 'Default' }, { value: 'google_apis', displayText: 'Google APIs' }]"
          v-model="formData.variant" />

        <SelectFormField id="hardware-profile" label="Hardware profiles (optional)" :tags="hardwareProfiles"
          v-model="formData.device" />

        <SelectFormField id="architecture" label="Architecture (optional)"
          :tags="[{ value: 'auto-detect', displayText: 'Automatically detect architecture' }, { value: 'x86' }, { value: 'x86_64' }, { value: 'armeabi-v7a' }, { value: 'arm64-v8a' }]"
          v-model="formData.architecture" default-option="auto-detect" />

      </form>

      <div v-if="errorMessage" class="alert alert-danger mt-3">
        {{ errorMessage }}
      </div>
      <div v-if="!errorMessage" class="alert alert-warning mt-3">
        Creating a new emulator may take a while especailly when
        the Android version has to be downloaded first.</div>
    </BootstrapModal>
  </div>
</template>

<script setup lang="ts">
import SelectFormField from './SelectFormField.vue';
import BootstrapModal from './BootstrapModal.vue';
import { fetchAndroidVersions, fetchHardwareProfiles, createAVD, ApiError } from '@/services/api';
import { type HardwareProfile, type AvdOptions, avdOptionsSchema } from '@mopri/schema';
import { reactive } from 'vue';
import { ref } from 'vue';
import type { SelectTag } from '@/types/ComponentTypes';

const isModalOpen = ref(false);
const closeModal = () => {
  isModalOpen.value = false;
}
const openModal = () => {
  isModalOpen.value = true;
}

const isLoadingAvdCreation = ref(false);

const androidVersions = ref<SelectTag<number>[]>([]);
const loadAndroidVersions = async () => {
  const avList = await fetchAndroidVersions();
  androidVersions.value = avList.map(av => ({ value: av.apiLevel, displayText: av.versionName }));
  if (androidVersions.value.length > 0) {
    formData.apiLevel = avList[avList.length - 1].apiLevel;
    defaultFormData.apiLevel = formData.apiLevel;
  }
}
loadAndroidVersions();

const hardwareProfiles = ref<SelectTag<string>[]>([]);
const loadHardwareProfiles = async () => {
  const hpList: HardwareProfile[] = await fetchHardwareProfiles();
  hardwareProfiles.value = hpList.map(hp => ({ value: hp.stringId, displayText: hp.name }));
  // set default selected
  if (hpList.length > 0) {
    if (hpList.find(hp => hp.stringId === 'pixel')) {
      formData.device = 'pixel';
    } else {
      formData.device = hpList[hpList.length - 1].stringId;
    }
    defaultFormData.device = formData.device;
  }
}
loadHardwareProfiles();

// Reactive reference for form data
const defaultFormData: AvdOptions = {
  name: '',
  apiLevel: 0,
  variant: 'default',
  device: '',
  architecture: 'auto-detect'
}
const formData = reactive<AvdOptions>({ ...defaultFormData });
// Reactive reference for error message
const errorMessage = ref<string | null>(null);

//// Handle form submission
const handleSubmit = async () => {
  // Manual validation
  const valResult = avdOptionsSchema.safeParse(formData);
  if (!valResult.success) {
    errorMessage.value = valResult.error.toString();
  } else {
    errorMessage.value = null; // Reset error message

    isLoadingAvdCreation.value = true;
    try {
      // If validation passes, handle the data (e.g., send to an API)
      await createAVD(valResult.data);
      closeModal();
      // Reset form after submission
      Object.assign(formData, defaultFormData);
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage.value = `HttpError ${error.statusCode}: ${error.body.errorMsg}`;
      } else {
        errorMessage.value = 'An unexpected error occurred:' + error;
      }
    } finally {
      isLoadingAvdCreation.value = false;
    }
  }
};
</script>

<style scoped>
/* Add any additional styles here */
</style>
