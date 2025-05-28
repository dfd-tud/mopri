<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div>
    <h1>Analysis Log</h1>
    <p>Below you can see the log output of the currently running analysis:</p>
    <LogEntry v-for="(log, index) of logs" :key="index" :log="log" />
    <button v-if="analysisId" @click="redirectToResultPage" class="btn btn-primary">Go to results</button>
  </div>
</template>
<script setup lang="ts">
import LogEntry from "./LogEntry.vue";
import { useRouter } from 'vue-router';
import { useAnalysisLogStore } from "@/stores/analysisLogStore";
import { storeToRefs } from "pinia";
import { onMounted, onBeforeUnmount } from "vue";

const analysisLogStore = useAnalysisLogStore();
const { logs, analysisId } = storeToRefs(analysisLogStore);
const router = useRouter();

// Ask user to confirm leaving the page during an active analysis (due to closing the tab or using browser navigations)
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (analysisLogStore.analysisState === "running") {
    event.preventDefault();
    event.returnValue = ''; // Chrome requires returnValue to be set
  }
};
// Add event listener for beforeunload when component is mounted
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});
// Remove event listener when component is unmounted
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
const redirectToResultPage = () => {
  router.push({ name: 'result', params: { id: analysisId.value } });
}
</script>
