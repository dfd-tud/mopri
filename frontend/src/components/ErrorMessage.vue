<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="error-msg">
  Request failed:
  <div v-for="(error, index) in props.validationError.errors" :key="index">{{ error.field }} - {{ error.message }}</div>
  </div>
</template>

<script setup lang="ts">
import type { ValidationErrorResponse } from "@/types/Error.ts";
const props = defineProps<{ validationError: ValidationErrorResponse }>()
</script>

<style scoped>
  .error-msg{
    color: red; 
  }
</style>
