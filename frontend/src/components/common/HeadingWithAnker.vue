<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <h2 :id="id">
    <slot></slot><a :href="'#' + id" class="ms-2 scroll-to">#</a>
  </h2>
</template>
<script setup lang="ts">
defineProps<{ id: string }>()
</script>
<style lang="css" scoped>
.scroll-to {
  color: blue;
  cursor: pointer;
  margin-left: 10px;
  display: none;
  /* Initially hidden */
}

h2:hover .scroll-to {
  display: inline;
  /* Show on hover */
}
</style>
