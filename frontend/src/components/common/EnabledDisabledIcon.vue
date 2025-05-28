<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <font-awesome-icon :icon="['fas', isEnabled ? 'check' : 'xmark']" class="ms-2" />
</template>
<script setup lang="ts">
defineProps<{ isEnabled: boolean }>();
</script>
