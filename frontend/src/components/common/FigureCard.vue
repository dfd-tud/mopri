<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="card mb-3">
    <div class="card-header">
      <font-awesome-icon class="me-2" :icon="icon" /> {{ title }}
    </div>
    <div class="card-body">
      <h2 class="card-title">{{ number }}</h2>
      <slot></slot> <!-- Slot for progress bars -->
    </div>
  </div>
</template>

<script lang="ts" setup>

// Define props with types
defineProps<{
  icon: [string, string]; // Tuple for FontAwesome icon
  title: string;
  number: number;
}>();
</script>
