<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { useRoute } from 'vue-router'

import PDFReportRenderer from '@/components/results/pdfReport/PDFReportRenderer.vue'
import { computed } from 'vue';

const route = useRoute()
const analysisId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id; // Ensure it's a string
});

</script>

<template>
  <main>
    <PDFReportRenderer :analysis-id="analysisId" />
  </main>
</template>
