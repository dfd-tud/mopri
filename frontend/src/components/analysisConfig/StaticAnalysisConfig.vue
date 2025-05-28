<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <HelpTextAlert>
    <p>
      In this step, you can choose to enable or disable <InlineCodeFragment>Exodus</InlineCodeFragment> analysis. When
      enabled, the <InlineCodeFragment>Exodus APK Analyzer</InlineCodeFragment> is utilized
      to extract permissions and included tracking libraries from the app installation package, providing insights into the app's
      capabilities to access sensitive data and track users. Be aware, however, that this information represents an
      upper
      bound, as not all permissions and library code may be actively utilized. For deeper insights, consider conducting
      a
      dynamic analysis in the next tab.
    </p>
    <p>
      For more information about <InlineCodeFragment>Exodus</InlineCodeFragment>, visit their <a
        href="https://exodus-privacy.eu.org/en/page/what/" target="_blank" rel="noopener noreferrer">official website</a>.
    </p>
    <span class="fst-italic text-muted">If you prefer a shorter execution time, we recommend disabling this
      feature.</span>
  </HelpTextAlert>
  <div class="form-check">
    <input id="checkboxExodus" class="form-check-input" type="checkbox" :checked="staticConfig.enableExodusModule"
      @change="toggleStaticModuleExodus" />
    <label class="form-check-label h5" for="checkboxExodus">
      Enable Exodus Analysis
    </label>
  </div>
</template>

<script setup lang="ts">
import HelpTextAlert from "../common/HelpTextAlert.vue";
import InlineCodeFragment from "../common/InlineCodeFragment.vue";
import { useUserConfigStore } from "@/stores/userConfigStore"
import { storeToRefs } from 'pinia'

const store = useUserConfigStore();
const { staticConfig } = storeToRefs(store);
const { toggleStaticModuleExodus } = store;
</script>
