<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div>
    <div v-if="errorMessage">{{ errorMessage }} </div>
    <div v-else class="mb-3">
      <h3 class="text-center">System Permissions</h3>
      <div class="mb-3">
        <ul class="list-group">
          <li :title="p.description" class="list-group-item d-flex justify-content-between align-items-start"
            v-for="(p, index) in enrichedPermissions?.systemPermissions" :key="index">
            <div class="ms-2 me-auto">
              <div class="fw-bold"><font-awesome-icon class="me-2" :icon="['fas', 'key']" />{{
                p.name }}</div>
              {{ p.summary }}
            </div>
            <span :class="p.protectionLevel === 'dangerous' ? 'bg-danger' : 'bg-info'" class="badge rounded-pill">{{
              p.protectionLevel }}</span>
          </li>
        </ul>
      </div>
      <div class="mb-3">
        <h3 class="text-center">Special Permissions</h3>
        <ul class="list-group">
          <li :title="p.description" class="list-group-item d-flex justify-content-between align-items-start"
            v-for="(p, index) in enrichedPermissions?.specialPermissions" :key="index">
            <div class="ms-2 me-auto">
              <div class="fw-bold"><font-awesome-icon class="me-2" :icon="['fas', 'key']" />{{ p.name }}</div>
              {{ p.summary }}
            </div>
            <span :class="p.protectionLevel === 'dangerous' ? 'bg-danger' : 'bg-info'" class="badge rounded-pill">{{
              p.protectionLevel }}</span>
          </li>
        </ul>
      </div>
      <div>
        <h3 class="text-center">Unkown Permissions</h3>
        <ul class="list-group">
          <li class="list-group-item" v-for="(p, index) in enrichedPermissions?.customPermissions" :key="index">
            <div><font-awesome-icon class="me-2" :icon="['fas', 'key']" />{{ p }}</div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApiError, fetchAnalysisResult } from "@/services/api";
import { RecordingResultTypes, type EnrichedPermissions } from "@mopri/schema";
import { onMounted, ref } from "vue";

const props = defineProps<{
  analysisId: string,
}>()

var enrichedPermissions = ref<EnrichedPermissions | undefined>();
const errorMessage = ref<string | undefined>(undefined);

const loadResult = async () => {
  const analysisId = props.analysisId;

  // Construct the URL using template literals
  try {
    enrichedPermissions.value = await fetchAnalysisResult<EnrichedPermissions>(analysisId, "enrichment", RecordingResultTypes.Permissions);
    enrichedPermissions.value.systemPermissions.sort((a, b) => {
      // Handle undefined protection levels
      const levelA = a.protectionLevel ?? '';
      const levelB = b.protectionLevel ?? '';

      // First, sort by protectionLevel
      const levelComparison = levelA.localeCompare(levelB);
      if (levelComparison !== 0) {
        return levelComparison;
      }

      // If protection levels are the same, sort by name
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode == 404) {
        errorMessage.value = "Not tested";
      } else {
        errorMessage.value = `HttpError ${error.statusCode}: ${error.body.errorMsg}`;
      }
    } else {
      errorMessage.value = 'An unexpected error occurred:' + error;
    }
  }
}
onMounted(loadResult);
</script>
<style scoped>
.list-group-item[title] {
  cursor: help;
}
</style>
