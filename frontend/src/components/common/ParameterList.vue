<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <ul class="list-group">
    <li class="list-group-item d-flex justify-content-between align-items-center" v-for="p in list" :key="p.name">{{
      p.name }}
      <span class="badge bg-secondary rounded-pill" :title="p.value.length > 60 ? p.value : undefined"
        @click="copyToClipboard(p.value)" style="cursor: pointer;">{{
          shortenStringForDisplay(p.value, 60) }}</span>

    </li>
  </ul>
  <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
    <div id="liveToast" class="toast" :class="copySuccess ? 'show' : 'hide'" role="alert" aria-live="assertive"
      aria-atomic="true">
      <div class="toast-header text-success">
        <font-awesome-icon :icon="['fas', 'check']" class="me-2" />
        <strong class="me-auto">Successfully copied value!</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        {{ copiedText }}
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { shortenStringForDisplay } from '@/utils';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ref } from 'vue';
const copySuccess = ref<boolean>();
const copiedText = ref<string>();

defineProps<{ list: { name: string, value: string }[] }>()
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    copiedText.value = text;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);

  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}
</script>
<style scoped></style>
