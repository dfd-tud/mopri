<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div>
    <div class="mb-3">
      <label for="file">
        <font-awesome-icon :icon="['fas', 'box']" />
        Select App Install Package</label>
      <select v-model="selectedAppPackage" id="file" class="form-select" aria-label="Select app install package" :disabled="appPackageListEmpty">
        <option v-if="appPackageListEmpty" value="">No app packages available - Upload an app via "Add Package" to get started.</option>
        <option v-for="app in sortedAppPackageList" :key="app.storageId" :value="app.storageId">
          {{ app.label }} (v. {{ app.version }}) - {{ app.package }}
        </option>
      </select>
    </div>

    <div class="mb-3">
      <button class="btn btn-outline-primary btn-sm" @click.stop="openModal">
        <font-awesome-icon :icon="['fas', 'plus']" />
        Add Package
      </button>
      <BootstrapModal modal-id="uploadAppPackageModal" title="Upload new App Install Package"
        submit-button-text="Upload" @submit="onFileUpload" @close="closeModal" :is-open="isModalOpen"
        :is-loading="loading">
        <HelpTextAlert>
          <div>
            <p>You can upload a new Android Package (<InlineCodeFragment>.apk</InlineCodeFragment>) file for analysis,
              including <InlineCodeFragment>.xapk</InlineCodeFragment> files (custom format from
              ApkPure). Please note that split APKs are currently not supported.</p>
            <div class="mb-3">
              APK files can be retrieved from:
              <ul>
                <li><strong>3rd Party Markets</strong> like <a href="https://apkpure.com" target="_blank">ApkPure</a>
                </li>
                <li><strong>Android Device</strong> using tools like <a href="https://github.com/alexrintt/kanade"
                    target="_blank">Kanade</a></li>
                <li><strong>Google Play Store</strong> via tools like <a href="https://github.com/EFForg/apkeep"
                    target="_blank">ApkKeep</a></li>
              </ul>
            </div>
            <div class="fst-italic">Ensure the APK matches the chip architecture (<InlineCodeFragment>arm64-v8a
              </InlineCodeFragment>,
              <InlineCodeFragment>armeabi-v7a</InlineCodeFragment>,<InlineCodeFragment>x86_64</InlineCodeFragment>) of
              your analysis
              device. Emulators usually adopt the architecture of their host system.
            </div>
          </div>
        </HelpTextAlert>
        <div class="mb-3">
          <label for="file">
            <font-awesome-icon :icon="['fas', 'box']" />
            App Package File</label>
          <input @change="onFileChange" type="file" class="form-control" id="file">
        </div>
      </BootstrapModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { fetchAppPackages, uploadAppPackage } from "@/services/api";
import { useUserConfigStore } from '@/stores/userConfigStore';
import { storeToRefs } from 'pinia';
import BootstrapModal from './BootstrapModal.vue';
import HelpTextAlert from '../common/HelpTextAlert.vue';
import InlineCodeFragment from '../common/InlineCodeFragment.vue';

import type { AppPackageInfo } from "@mopri/schema";
import { onMounted } from 'vue';

// Reactive state
const appPackageList = ref<AppPackageInfo[]>([]);
const loading = ref(false);
const isModalOpen = ref(false);
const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);

// Load app packages
const loadAppPackageList = async (addedNewAppPackage = false) => {
  const newList: AppPackageInfo[] = await fetchAppPackages();
  appPackageList.value = newList;

  // Automatically select the most recent app package
  // only if either a new app package was uploaded or no app packages is selected yet
  if (addedNewAppPackage || !selectedAppPackage.value) {
    if (newList.length > 0) {
      const mostRecentAppPackage = newList.reduce((lastAppPackage, currentAppPackage) => {
        return (lastAppPackage.uploadTime > currentAppPackage.uploadTime) ? lastAppPackage : currentAppPackage;
      });
      selectedAppPackage.value = mostRecentAppPackage.storageId;
    }
  }
};
onMounted(loadAppPackageList);

// User config store
const userConfig = useUserConfigStore();
const { appPackageStorageId } = storeToRefs(userConfig);

// Computed property for selected app package
const selectedAppPackage = computed({
  get: () => appPackageStorageId.value,
  set: (value) => {
    userConfig.setAppPackageStorageId(value);
  }
});

const appPackageListEmpty = computed(() => !appPackageList.value || appPackageList.value.length === 0);

// Computed property for sorted app package list
const sortedAppPackageList = computed(() => {
  if (appPackageListEmpty.value) return [];
  return [...appPackageList.value].sort((a, b) => {
    return a.label.toString().toLowerCase().localeCompare(b.label.toString().toLowerCase());
  });
});

// Modal control
const closeModal = () => {
  isModalOpen.value = false;
};
const openModal = () => {
  isModalOpen.value = true;
};

// File handling
const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

const onFileUpload = async () => {
  if (selectedFile.value) {
    loading.value = true;
    try {
      await uploadAppPackage(selectedFile.value);
      await loadAppPackageList(true); // Reload the app package list after upload
      closeModal();
    } catch (error) {
      errorMessage.value = 'Error uploading file: ' + error;
    } finally {
      loading.value = false;
    }
  }
};
</script>
