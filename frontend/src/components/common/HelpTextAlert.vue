<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="alert alert-info d-flex align-items-center" role="alert">
    <font-awesome-icon :icon="['fas', 'info-circle']" class="me-3" />
    <div>
      <slot/>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>
