<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="container">
      <HeadingWithAnker id="section-receivers">Receiving Entities</HeadingWithAnker>
    <!--  filters: hide on print -->
    <div class="d-print-none">
      <!-- WorldMap Modal -->
      <div class="mb-3">
        <!-- Button to trigger modal -->
        <button type="button" class="btn btn-outline-success w-100" data-bs-toggle="modal" data-bs-target="#mapModal">
          <font-awesome-icon class="me-2" :icon="['fas', 'earth-americas']" />Show Traffic Destinations on Map
        </button>

        <!-- Modal -->
        <div class="modal fade" id="mapModal" tabindex="-1" aria-labelledby="mapModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="mapModalLabel">Traffic Destinations</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body d-flex justify-content-center align-items-center" style="height: 400px;">
                <WorldMap v-if="enrichedReceivingEntities" :country-codes="countryCodes" :width="600" :height="400" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <input type="text" class="form-control" placeholder="Filter by hostname..." v-model="filter" />
      </div>
    </div>
    <table class="d-print-table table table-striped mt-4">
      <thead class="table-dark">
        <tr>
          <th @click="sort('hasOnlyEncryptedTraffic')" class="pointer" style="min-width: 50px;">
            <font-awesome-icon :icon="['fas', 'user-ninja']" />
            <font-awesome-icon v-if="sortKey === 'hasOnlyEncryptedTraffic'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('hostname')" class="pointer">
            Hostname
            <font-awesome-icon class="ms-2" v-if="sortKey === 'hostname'"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('ip')" class="pointer">
            IP
            <font-awesome-icon v-if="sortKey === 'ip'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('requestCount')" class="pointer" style="min-width: 120px;">
            #Requests
            <font-awesome-icon v-show="sortKey === 'requestCount'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('domainOrg')" class="pointer">
            Organisation
            <font-awesome-icon v-show="sortKey === 'domainOrg'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('ipOrg')" class="pointer">
            Hosting Provider
            <font-awesome-icon v-show="sortKey === 'ipOrg'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('country')" class="pointer">
            Country
            <font-awesome-icon v-show="sortKey === 'country'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
          <th @click="sort('blocked')" class="pointer" style="min-width: 50px;">
            <font-awesome-icon :icon="['fas', 'ban']" />
            <font-awesome-icon v-show="sortKey === 'blocked'" class="ms-2"
              :icon="sortOrder === 'asc' ? ['fas', 'sort-up'] : ['fas', 'sort-down']" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entity in filteredEntities" :key="entity.hostname + entity.ip">
          <td><font-awesome-icon v-if="entity.hasOnlyEncryptedTraffic" :icon="['fas', 'user-ninja']"
              title="Could not decrypt requests for this domain" /></td>
          <td class="wrap-sm">{{ entity.hostname }}</td>
          <td>{{ entity.ip || 'N/A' }}</td>
          <td>{{ entity.requestCount }}</td>
          <td>{{ entity.domainWhoisInfo?.orgName || 'N/A' }}</td>
          <td>{{ entity.ipWhoisInfo?.org?.orgName || 'N/A' }}</td>
          <td><span class="me-2">{{ entity.ipWhoisInfo?.location?.flagEmoji }}</span>{{
            entity.ipWhoisInfo?.location?.country || 'N/A' }}</td>
          <td><font-awesome-icon v-if="entity.blockListHits.length > 0" :icon="['fas', 'ban']" title="Blocklisted" />
          </td>
        </tr>
      </tbody>
    </table>
    <div>
      Hosts with failed decryption: {{ hostsFailedDecryption }}</div>
    <div>Requests that could not be decrypted: {{ requestsFailedDecryption }}</div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EnrichedReceivingEntity } from '@mopri/schema';

import WorldMap from './WorldMap.vue';
import HeadingWithAnker from '@/components/common/HeadingWithAnker.vue';

const props = defineProps<{
  enrichedReceivingEntities: Array<EnrichedReceivingEntity>;
}>();

const hostsFailedDecryption = computed(() => {
  return props.enrichedReceivingEntities.filter(e => e.hasOnlyEncryptedTraffic).length;
});

const requestsFailedDecryption = computed(() => {
  return props.enrichedReceivingEntities.filter(e => e.hasOnlyEncryptedTraffic).reduce((sum, e) => {
    return e.hasOnlyEncryptedTraffic ? sum + e.requestCount : sum;
  }, 0);
});

const countryCodes = computed(() => props.enrichedReceivingEntities?.map(r => r.ipWhoisInfo?.location?.countryCode ?? ''));

const filter = ref('');
const sortKey = ref('hostname');
const sortOrder = ref('asc');

const filteredEntities = computed(() => {
  let entities = props.enrichedReceivingEntities;

  // Filter by hostname
  if (filter.value) {
    entities = entities.filter(entity =>
      entity.hostname.toLowerCase().includes(filter.value.toLowerCase())
    );
  }
  // Sort entities
  entities.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Determine the value to sort by
    switch (sortKey.value) {
      case 'hasOnlyEncryptedTraffic':
        // switch sorting to match with asc / desc
        aValue = b.hasOnlyEncryptedTraffic;
        bValue = a.hasOnlyEncryptedTraffic;
        break;
      case 'ip':
        aValue = a.ip || '';
        bValue = b.ip || '';
        break;
      case 'domainOrg':
        aValue = a.domainWhoisInfo?.orgName?.toLowerCase() || '';
        bValue = b.domainWhoisInfo?.orgName?.toLowerCase() || '';
        break;
      case 'ipOrg':
        aValue = a.ipWhoisInfo?.org?.orgName?.toLowerCase() || '';
        bValue = b.ipWhoisInfo?.org?.orgName?.toLowerCase() || '';
        break;
      case 'country':
        aValue = a.ipWhoisInfo?.location?.country?.toLowerCase() || '';
        bValue = b.ipWhoisInfo?.location?.country?.toLowerCase() || '';
        break;
      case 'blocked':
        aValue = a.blockListHits.length > 0 ? 1 : 0;
        bValue = b.blockListHits.length > 0 ? 1 : 0;
        break;
      default:
        aValue = a[sortKey.value as keyof EnrichedReceivingEntity] ?? a.hostname.toLowerCase();
        bValue = b[sortKey.value as keyof EnrichedReceivingEntity] ?? b.hostname.toLowerCase();
    }
    if (aValue < bValue) return sortOrder.value === 'asc' ? 1 : -1;
    if (aValue > bValue) return sortOrder.value === 'asc' ? -1 : 1;
    return 0;
  });

  return entities;
});


const sort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};
</script>

<style scoped>
.pointer {
  cursor: pointer;
}
</style>
