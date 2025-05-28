<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div :class="log.type">{{ log.content }}</div>
  <button type="button" class="btn btn-primary" v-if="showStopButton" @click="stopRecording" :disabled="disableStopButton">Stop recording</button>
</template>

<script setup lang="ts">
import { stopAnalysis } from "@/services/api";
import { computed } from "vue";
import { ref } from "vue";
const props = defineProps<{
  log: { content: string, module: string, type: "log" | "error" | "start" | "stop" | "callToAction" | "done" }
}>()
const showStopButton = computed(() => {
  return props.log.content == 'Interact with the app!';
});
const disableStopButton = ref(false);
const stopRecording = async () => {
  stopAnalysis();
  disableStopButton.value = true;
}
</script>
<style>
.error {
  color: red;
}
.log {
  font-style: italic;
}
.callToAction {
  font-weight: 900;
}
</style>
