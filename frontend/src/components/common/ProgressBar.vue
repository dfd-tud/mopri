<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <h6>{{ title }}: {{ value }}</h6>
  <div class="progress mb-3">
    <div class="progress-bar" role="progressbar" :style="{ width: percentage }" :aria-valuenow="value" aria-valuemin="0"
      :aria-valuemax="max">
      <span class="visually-hidden">{{ value }}%</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

// Define props with types
const props = defineProps<{
  title: string;
  value: number; // Current value of the progress
  max: number; // Maximum value of the progress
}>();

// Calculate percentage
const percentage = computed(() => {
  return props.max > 0 ? `${(props.value / props.max) * 100}%` : '0%';
});
</script>

<style scoped>
.progress-bar {
  transition: width 0.6s ease;
  /* Smooth transition */
}
</style>
