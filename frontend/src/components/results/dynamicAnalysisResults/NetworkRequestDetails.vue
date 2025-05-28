<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div v-if="print">
    <div class="mt-3" v-if="requestEntry.headers">
      <h5>Headers</h5>
      <ParameterList :list="requestEntry.headers" />
    </div>
    <div class="mt-3" v-if="requestEntry.cookies.length > 0">
      <h5>Cookies</h5>
      <ParameterList :list="requestEntry.cookies" />
    </div>
    <div class="mt-3" v-if="requestEntry.queryString.length > 0">
      <h5>Query Parameters</h5>
      <ParameterList :list="requestEntry.queryString" />
    </div>
    <div class="mt-3" v-if="postDataObj">
      <h5>POST-Payload ({{ requestEntry.postData?.mimeType }})</h5>
      <VueJsonView :src="postDataObj" />
    </div>
  </div>
  <div v-else-if="requestEntry">
    <div class="accordion" id="accordionRequestDetails">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingOne">
          <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne"
            aria-expanded="true" aria-controls="collapseOne">
            General details
          </button>
        </h2>
        <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne"
          data-bs-parent="#accordionRequestDetails">
          <div class="accordion-body">
            <div class="mb-3">
              <h5 class="mb-1">URL (without parameters):</h5>
              <a :href="urlWithoutQueryStrings" target="_blank" class="text-decoration-none text-primary">
                {{ urlWithoutQueryStrings }}
              </a>
            </div>
            <div class="mb-3">
              <strong>Method:</strong> <span class="badge bg-secondary">{{ requestEntry.method }}</span>
            </div>
            <div class="mb-3">
              <strong>Body size:</strong> <span class="badge bg-info">{{ requestEntry.bodySize }} bytes</span>
            </div>
            <div class="mb-3">
              <strong>Number of cookies:</strong> <span
                :class="requestEntry.cookies.length > 0 ? 'bg-danger' : 'bg-success'" class="badge">{{
                  requestEntry.cookies.length }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class=" accordion-item">
        <h2 class="accordion-header" id="headingHeaders">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapseHeaders" aria-expanded="false" aria-controls="collapseHeaders">
            Headers
          </button>
        </h2>
        <div id="collapseHeaders" class="accordion-collapse collapse" aria-labelledby="headingHeaders"
          data-bs-parent="#accordionRequestDetails">
          <div class="accordion-body">
            <ParameterList :list="requestEntry.headers" />
          </div>
        </div>
      </div>
      <div v-if="requestEntry.cookies.length > 0" class=" accordion-item">
        <h2 class="accordion-header" id="headingCookies">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapseCookies" aria-expanded="false" aria-controls="collapseCookies">
            Cookies
          </button>
        </h2>
        <div id="collapseCookies" class="accordion-collapse collapse" aria-labelledby="headingCookies"
          data-bs-parent="#accordionRequestDetails">
          <div class="accordion-body">
            <ParameterList :list="requestEntry.cookies" />
          </div>
        </div>
      </div>
      <div v-if="requestEntry.queryString.length > 0" class=" accordion-item">
        <h2 class="accordion-header" id="headingTwo">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
            Get parameters
          </button>
        </h2>
        <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo"
          data-bs-parent="#accordionRequestDetails">
          <div class="accordion-body">
            <ParameterList :list="requestEntry.queryString" />
          </div>
        </div>
      </div>
      <div v-if="requestEntry.postData" class="accordion-item">
        <h2 class="accordion-header" id="headingThree">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
            POST data
          </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree"
          data-bs-parent="#accordionRequestDetails">
          <div class="accordion-body wrap">
            <VueJsonView v-if="postDataObj" :src="postDataObj" />
            <div v-else>{{ requestEntry.postData.text }}</div>
            <div><strong>{{ requestEntry.postData.mimeType }}</strong> </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Request } from "har-format";
import { computed } from "vue";
import ParameterList from "../../common/ParameterList.vue";
import { onMounted } from "vue";
const props = defineProps<{ requestEntry: Request, print?: boolean }>();
const urlWithoutQueryStrings = computed(() => {
  if (!props.requestEntry) return "not found"
  const url = new URL(props.requestEntry?.url); return url.origin + url.pathname
});
const postDataObj = computed(() => {
  const postData = props.requestEntry.postData;
  if (postData?.mimeType.includes("application/json")) {
    return postData.text ? JSON.parse(postData.text) : {};
  } else if (postData?.mimeType.includes("x-www-form-urlencoded")) {
    // Converts an array of name-value pairs from postData.params into an object, using names as keys and JSON-decoded values where applicable
    if (postData.params) {
      // Parse the outer JSON
      const parsedData = Object.fromEntries(
        postData.params.map((param) => {
          try {
            return [param.name, JSON.parse(param.value ?? '')];
          } catch {
            return [param.name, param.value];
          }
        })
      );
      // Decode inner JSON strings in the context object (this sometimes happens e.g. with facebook)
      decodeInnerJson(parsedData);
      return parsedData;
    }
    return postData?.params;
  } else if (postData?.mimeType.includes("text/plain") && postData.text) {
    try {
      return JSON.parse(postData.text);
    } catch { return undefined }
  }
  return undefined;
});

function decodeInnerJson(obj: Record<string, any>) {
  // Check if the input is an object
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      // If the value is an object, recurse into it
      if (typeof obj[key] === 'object') {
        decodeInnerJson(obj[key]);
      } else if (typeof obj[key] === 'string') {
        try {
          // Attempt to parse the string as JSON
          const parsedValue = JSON.parse(obj[key]);
          // Only replace if parsing was successful
          obj[key] = parsedValue;
        } catch {
          // If parsing fails, keep the original value
        }
      }
    }
  }
}

// hot fix to avoid overflowing values in vue-json-view 
// display long strings as block instead of inline
const fixValueDisplayInJson = () => {
  const divs = document.querySelectorAll('.variable-value');
  divs.forEach(div => {
    const childContent = div.textContent || (div as HTMLElement)?.innerText;
    if (childContent && childContent.length > 50) {
      // overwrite style="display: inline-block" with class in both the parent and first (and only) child element
      div.children[0].classList.add('block', 'wrap');
      div.classList.add('block', 'wrap');
    }
  });
}
onMounted(fixValueDisplayInJson);


</script>
<style>
.block {
  display: block !important;
}
</style>
