<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div>
    <div class="d-flex align-items-center position-relative">
      <slot name="heading" />
      <div class="position-relative">
        <button class="btn btn-link" @click="togglePopup" aria-label="More info">
          <font-awesome-icon :icon="['far', 'circle-question']" />
        </button>
        <div v-if="showPopup" class="popup-alert">
          <div class="d-flex align-items-center alert alert-info alert-dismissible fade show" role="alert">
            <font-awesome-icon class="bi flex-shrink-0 me-4" :icon="['fas', 'info-circle']" />
            <div>
              <slot />
            </div>
            <button type="button" class="btn-close" @click="togglePopup" aria-label="Close"></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showPopup = ref(false);

const togglePopup = () => {
  showPopup.value = !showPopup.value;
};
</script>

<style scoped>
.popup-alert {
  position: absolute;
  z-index: 1000;
  width: auto;
  min-width: 600px;
  left: 100%;
  /* Align the alert box to the right of the button */
  top: 0;
  /* Position it below the button */
}
</style>

