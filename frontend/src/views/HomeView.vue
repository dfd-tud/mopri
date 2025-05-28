<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container mt-5">
    <h1 class="display-1 text-center mb-4">mopri - Mobile Privacy Analysis</h1>

    <p class="lead text-center mb-4">
      Mopri is a project designed for the privacy analysis of mobile applications. It integrates a variety of analyses
      and tools into a streamlined pipeline, providing users with a web interface to control the process and investigate
      comprehensive analysis results.
    </p>

    <h2 class="text-center">Current Key Features:</h2>
    <div class="d-flex justify-content-center mb-5">
      <ul class="list-group list-unstyled" style="max-width: 600px; width: 100%;">
        <li class="mb-2">
          <font-awesome-icon :icon="['fas', 'mobile-screen-button']" class="me-2" />
          <strong>Supported Platform:</strong> Android
        </li>
        <li class="mb-2">
          <font-awesome-icon :icon="['fas', 'code']" class="me-2" />
          <strong>Static Analysis:</strong> Analyzes permissions and tracking libraries using Exodus.
        </li>
        <li class="mb-2">
          <div class="mb-2"><font-awesome-icon :icon="['fas', 'sync']" class="me-2" />
            <strong>Dynamic Analysis:</strong> Multiple strategies for recording network traffic
          </div>
          <ul class="ms-3">
            <li class=" mb-2">
              <span class="fw-bold">Supports Physical & Emulated Devices</span>
            </li>
            <li class="">
              <span class="fw-bold">Detailed Traffic Analysis & Processing</span>
            </li>
          </ul>
        </li>
        <li class="mb-2">
          <font-awesome-icon :icon="['far', 'file-alt']" class="me-2" />
          <strong>Comprehensive Reporting</strong>
        </li>
        <li class="mb-2">
          <font-awesome-icon :icon="['fas', 'cogs']" class="me-2" />
          <strong>Modular Design:</strong> Easily extendable for future enhancements and features. 
        </li>
      </ul>
    </div>
    <p class="text-center mb-4">
      Mopri can be used with an Android emulator (automatically installed by mopri) or a physical Android device
      (needs to be <a href="https://docs.tweasel.org/usage/setup/#physical-android-phones" target="_blank">rooted</a>).
      All applications installed during an anylsis on the device are automatically removed after analysis is completed.
    </p>

    <div class="text-center">
      <div class="d-grid gap-3" style="max-width: 300px; margin: 0 auto;">
        <RouterLink :to="{ name: 'createAnalysis' }" class="btn btn-primary btn-lg">
          <font-awesome-icon class="me-2" :icon="['fas', 'plus']" />Create New Analysis
        </RouterLink>
        <RouterLink :to="{ name: 'analysesCatalog' }" class="btn btn-secondary btn-lg">
          <font-awesome-icon class="me-2" :icon="['fas', 'list']" />View Analyses
        </RouterLink>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>
<style scoped></style>
