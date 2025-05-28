<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-4">
    <h1 class="mb-4 text-center">Analyses Catalog</h1>
    <table class="table table-striped table-hover">
      <thead class="table-dark">
        <tr>
          <th @click="sortTable('analysisName')" class="pointer">Analysis Name
            <font-awesome-icon v-if="sortKey === 'analysisName'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sortTable('appPackageStorageId')" class="pointer">App
            <font-awesome-icon v-if="sortKey === 'appPackageStorageId'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sortTable('dynamicConfig.deviceType')" class="pointer" style="min-width: 190;">Analysis Device
            Type
            <font-awesome-icon v-if="sortKey === 'dynamicConfig.deviceType'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sortTable('createdAt')" class="pointer">Created At
            <font-awesome-icon v-if="sortKey === 'createdAt'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedAnalysesList" :key="item.analysisId">
          <td><strong>{{ item.analysisName }}</strong></td>
          <td>{{ item.appPackageStorageId.split('_')[0] }} - v.{{ item.appPackageStorageId.split('_')[1] }}</td>
          <td>
            <span v-if="item.dynamicConfig.enableTrafficRecording">{{ item.dynamicConfig.deviceType }}</span>
            <span v-else><font-awesome-icon :icon="['fas', 'xmark']" /></span>
          </td>
          <td>{{ formatDate(new Date(item.createdAt)) }}</td>
          <td class="text-center">
            <div class="btn-group" role="group">
              <button @click="openDetailedResultView(item.analysisId)" class="btn btn-info me-2" title="View">
                <font-awesome-icon :icon="['fas', 'eye']" />
              </button>
              <button @click="populateNewAnalysisWithCurrentEntry(item)" class="btn btn-warning me-2" title="Repeat">
                <font-awesome-icon :icon="['fas', 'clone']" />
              </button>
              <button @click="deleteCurrentEntry(item.analysisId)" class="btn btn-danger" title="Delete">
                <font-awesome-icon :icon="['fas', 'trash']" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { formatDate } from "@/utils";
import { useRouter } from 'vue-router';
import { useUserConfigStore } from '../../stores/userConfigStore';
import type { AnalysisMeta } from '@mopri/schema';
import { fetchAnalysisList, deleteAnalysis } from "@/services/api";
import { computed } from 'vue';

const rawAnalysisList = ref<AnalysisMeta[]>([]);
const router = useRouter();


const loadAnalysisList = async () => {
  try {
    rawAnalysisList.value = await fetchAnalysisList();
  } catch (error) {
    //todo proper error handling
    console.error("Failed to load analysis list", error);
  }
};

onMounted(() => {
  loadAnalysisList();
  sortTable('createdAt');
});

const openDetailedResultView = (analysisId: string) => {
  router.push({ name: 'result', params: { id: analysisId } });
};

const populateNewAnalysisWithCurrentEntry = (item: AnalysisMeta) => {
  const store = useUserConfigStore();
  store.overwriteStore(item);
  router.push({ name: 'createAnalysis' });
};

const deleteCurrentEntry = async (analysisId: string) => {
  try {
    await deleteAnalysis(analysisId);
    loadAnalysisList();
  } catch (e) {
    console.error("Failed to delete analysis with id: " + analysisId, e);
  }
};

// sorting
const sortKey = ref<string>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');

const sortTable = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

/**
 * Retrieves the value of a nested property from an object using a dot-separated key string.
 * 
 * @param item - The object from which to retrieve the value.
 * @param key - A string representing the path to the desired property, using dot notation (e.g. 'dynamicConfig.deviceType').
 * @returns The value at the specified path, or undefined if the path does not exist.
*/
const getValue = <T extends Record<string, any>>(item: T, key: string): any => {
  return key.split('.').reduce((o, k) => (o || {})[k], item);
};

const sortedAnalysesList = computed(() => {
  const newList = [...rawAnalysisList.value];
  newList.sort((a, b) => {
    const aValue = getValue(a, sortKey.value).toLowerCase();
    const bValue = getValue(b, sortKey.value).toLowerCase();

    if (aValue < bValue) return sortOrder.value === 'asc' ? 1 : -1;
    if (aValue > bValue) return sortOrder.value === 'asc' ? -1 : 1;
    return 0;
  });
  return newList;
});

</script>

<style scoped>
.pointer {
  cursor: pointer;
}
</style>
