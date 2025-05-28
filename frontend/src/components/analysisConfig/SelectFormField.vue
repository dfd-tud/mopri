<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="mb-3">
    <label :for="id" class="form-label h5">{{ label }}</label>
    <select class="form-select" :id v-model="tagModel">
      <option v-for="tag in tags" :value="tag.value" :key="tag.id ?? tag.value">{{ tag.displayText ?? tag.value }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { SelectTag } from "../../types/ComponentTypes.js";
defineProps<{
  id: string
  tags: SelectTag<any>[],
  label: string,
  defaultOption?: string,
}
>();
const tagModel = defineModel();

</script>
