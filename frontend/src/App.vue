<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <header class="mb-3">
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <RouterLink class="navbar-brand" :to="{ name: 'home' }">
          <img src="@/assets/logo.svg" alt="" height="40" class="d-inline-block align-text-top">
        </RouterLink>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
          aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <div class="navbar-nav">
            <RouterLink class="nav-link" active-class="active" :to="{ name: 'analysesCatalog' }"><font-awesome-icon
                class="me-2" :icon="['fas', 'list']" />Analyses</RouterLink>
            <RouterLink class="nav-link" active-class="active" :to="{ name: 'createAnalysis' }"><font-awesome-icon
                class="me-2" :icon="['fas', 'plus']" />New Analysis</RouterLink>
            <!-- Conditional rendering for analysis state -->
            <template v-if="analysisLogStore.analysisState !== 'notStarted'">
              <RouterLink class="nav-link" active-class="active" :to="{ name: 'analysisLog' }">
                <span class="dot" v-if="analysisLogStore.analysisState === 'running'"></span>
                <font-awesome-icon :icon="['fas', 'clock-rotate-left']" class="me-2" v-else />
                <span>
                  {{ analysisLogStore.analysisState === 'running' ? 'Running Analysis' : 'View Last Analysis Log' }}
                </span>
              </RouterLink>
            </template>
          </div>

        </div>
      </div>
    </nav>
  </header>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAnalysisLogStore } from "@/stores/analysisLogStore";
const analysisLogStore = useAnalysisLogStore();

</script>

<style scoped>
.dot {
  display: inline-block;
  width: 10px;
  /* Size of the dot */
  height: 10px;
  /* Size of the dot */
  border-radius: 50%;
  /* Make it circular */
  background-color: green;
  /* Color of the dot */
  margin-right: 5px;
  /* Space between the dot and text */
  animation: blinking 1s infinite;
  /* Blinking effect */
}

@keyframes blinking {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}
</style>
