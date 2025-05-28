<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-4">
    <h3 class="text-center mb-4">Tracking Libraries</h3>
    <div v-if="errorMessage" class="alert alert-danger text-center">{{ errorMessage }}</div>
    <div v-else>
      <div class="accordion" id="trackingLibrariesAccordion">
        <div class="accordion-item" v-for="(library, index) in trackingLibraries" :key="index">
          <h2 class="accordion-header accordion-flush bg-warning" :id="'heading' + index">
            <button class="accordion-button d-flex align-items-center justify-content-between collapsed" type="button"
              data-bs-toggle="collapse" :data-bs-target="'#collapse' + index" aria-expanded="false"
              :aria-controls="'collapse' + index">
              <!-- Library Name -->
              <div class="fw-bold text-primary me-3"><font-awesome-icon class="me-2"
                  :icon="['fas', 'eye']" />{{ library.name }}</div>
              <!-- Categories -->
              <div v-if="library.categories.length > 0">
                <span v-for="category in library.categories" :key="category" class="badge bg-warning text-dark me-2">
                  {{ category }}
                </span>
              </div>
            </button>
          </h2>
          <div class="accordion-collapse collapse" :id="'collapse' + index" aria-labelledby="'heading' + index">
            <div class="accordion-body">
              <h4 class="mb-2">Website</h4>
              <div class="mb-3">
                <a :href="library.website" target="_blank" class="text-decoration-none">
                  <font-awesome-icon class="me-2" :icon="['fas', 'external-link-alt']" />Visit Library Website
                </a>
              </div>
              <!-- Description -->
              <h4 class="mb-2">Tracker Description</h4>
              <p class="text-muted">This description is sourced from <a :href="getExodusTrackerURL(library.id)"
                  target="_blank" class="text-muted">
                  ExodusPrivacy
                </a></p>

              <div class="border p-3 bg-light rounded">
                <div v-if="library.description" v-html="parseDescription(library.description)"></div>
                <div v-else class="fst-italic">No description provided.</div>
              </div>
              <!-- Source Link -->
              <div class="mt-2">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApiError, fetchAnalysisResult } from "@/services/api";
import { ref } from "vue";
import { RecordingResultTypes, type EnrichedTrackingLibrary } from "@mopri/schema";
import { computed } from "vue";
import DOMPurify from 'dompurify'; import { marked } from "marked";
import { onMounted } from "vue";
const props = defineProps<{
  analysisId: string,
}>()

var result = ref<EnrichedTrackingLibrary[] | undefined>(undefined);
const errorMessage = ref<string | undefined>(undefined);

const loadResult = async () => {
  const analysisId = props.analysisId;

  if (analysisId) {
    // Construct the URL using template literals
    try {
      result.value = await fetchAnalysisResult<EnrichedTrackingLibrary[]>(analysisId, "enrichment", RecordingResultTypes.TrackerLibraries);
      // Sort the list based on the name property
      result.value.sort((a, b) => a.name.localeCompare(b.name));
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
  } else {
    errorMessage.value = "No recording found";
  }
}
var trackingLibraries = computed(() => result.value);

onMounted(loadResult);

// library description as extracted from exodus is written in markdown -> needs to parsed into html
// marked does not sanitize html -> use another library for sanitizing
const parseDescription = (description: string) =>
  DOMPurify.sanitize(marked.parse(description, { async: false }))

const getExodusTrackerURL = (id: number) => `https://reports.exodus-privacy.eu.org/en/trackers/${id}/`;
</script>
