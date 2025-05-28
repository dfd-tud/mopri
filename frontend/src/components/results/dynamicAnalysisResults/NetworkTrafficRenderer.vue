<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <!-- Print request list -->
  <div v-if="print">
    <ul class="list-unstyled">
      <li class="mb-3" v-for="(request) in networkRequestList" :key="request.id">
        <div>{{ formatTime(new Date(request.startedDateTime), true, true) }} - <span class="fw-bold">{{ request.hostname
            }}</span> - {{ request.method
          }}</div>
        <div>
          <div class="row align-items-center" title="Full URL">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'link']" />
            </div>
            <div class="col-11">
              <a :title="request.fullURL" :href="request.fullURL" target="_blank"
                class="text-decoration-none text-primary">
                {{ shortenStringForDisplay(request.fullURL, 50) }}
              </a>
            </div>
          </div>

          <div class="row align-items-center" title="Company">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'building']" />
            </div>
            <div class="col-11">
              <span :class="{ 'fst-italic': !request.receiverInfo?.domainWhoisInfo?.orgName }">{{
                request.receiverInfo?.domainWhoisInfo?.orgName ?? 'Unknown' }}</span>
            </div>
          </div>

          <div class="row align-items-center" title="Server IP">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'server']" />
            </div>
            <div class="col-11">
              <span :class="{ 'fst-italic': !request.serverIP }">{{ request.serverIP ?? 'Unknown' }}</span>
            </div>
          </div>

          <div class="row align-items-center" title="Hosting Provider">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'cloud']" />
            </div>
            <div class="col-11">
              <a v-if="request.receiverInfo?.ipWhoisInfo?.org?.domain && request.receiverInfo.ipWhoisInfo.org.orgName"
                :href="'https://' + request.receiverInfo.ipWhoisInfo.org.domain" target="_blank">{{
                  request.receiverInfo.ipWhoisInfo.org.orgName }}</a>
              <span v-else :class="{ 'fst-italic': !request.receiverInfo?.ipWhoisInfo?.org?.orgName }">{{
                request.receiverInfo?.ipWhoisInfo?.org?.orgName ?? 'N/A' }}</span>

            </div>
          </div>

          <div class="row align-items-center" title="IP Address Location">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'map-marker-alt']" />
            </div>
            <div class="col-11">
              <span :class="{ 'fst-italic': !request.receiverInfo?.ipWhoisInfo?.location?.country }">
                {{ request.receiverInfo?.ipWhoisInfo?.location?.country ?? 'Unknown' }}
              </span>
              <span class="ms-2" v-if="request.receiverInfo?.ipWhoisInfo?.location?.flagEmoji">
                {{ request.receiverInfo.ipWhoisInfo?.location.flagEmoji }}
              </span>
            </div>
          </div>

          <div v-if="request.sensitiveData" class="row align-items-center" title="Potential Sensitive Info">
            <div class="col-1">
              <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
            </div>
            <div class="col-11">
              <span class="badge bg-danger me-2" v-for="d in request.sensitiveData" :key="d"
                :title="getDeviceDataValue(d)">{{ d }}</span>
            </div>
          </div>
        </div>
        <NetworkRequestDetails :request-entry="request.requestObj" :print="true" />
      </li>
    </ul>
  </div>

  <div v-else>
    <div class="position-relative">
      <button @click="executeTrafficEnrichmentUpdate()" class="btn btn-light float-end me-2"
        :disabled="enrichmentUpdateRunning" title="Redo Traffic Enrichment">
        <font-awesome-icon :icon="['fas', 'sync']" />
      </button>
      <button class="btn btn-light float-end" data-bs-toggle="tooltip" data-bs-placement="left" title="Show Filters"
        @click.stop="toggleFilter">
        <font-awesome-icon icon="filter" />
      </button>
      <button class="btn btn-light float-end" data-bs-toggle="tooltip" data-bs-placement="left"
        title="Playback Settings" @click.stop="togglePlaybackSettings">
        <font-awesome-icon icon="cog" />
      </button>
      <div v-if="filterVisible" ref="filterWindow"
        class="filter-area mb-4 p-3 border rounded bg-light position-absolute"
        style="top: 40px; right: 0; z-index: 1000;">
        <h5 class="mb-3">Filter Options</h5>
        <div class="input-group mb-3">
          <span class="input-group-text" id="filter-addon"><font-awesome-icon :icon="['fas', 'filter']" /></span>
          <input type="text" class="form-control" placeholder="Filter by hostname..." aria-label="Hostname"
            aria-describedby="filter-addon" v-model="hostnameFilter">
        </div>
        <div class="dropdown mb-3">
          <button class="btn btn-secondary dropdown-toggle w-100" type="button" id="dropdownMenuButton"
            data-bs-toggle="dropdown" aria-expanded="false">
            HTTP Method: {{ selectedMethod }}
          </button>
          <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <li><a class="dropdown-item" href="#" @click.prevent="updateSelectedMethod('GET')">GET</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="updateSelectedMethod('POST')">POST</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="updateSelectedMethod('ALL')">All</a></li>
          </ul>
        </div>
        <button class="btn btn-danger w-100" @click="clearFilters">
          <span class="me-2"><font-awesome-icon :icon="['fas', 'trash']" /></span>Clear Filters
        </button>
      </div>
      <div v-if="playbackSettingsVisible" ref="playbackSettingsWindow"
        class="filter-area mb-4 p-3 border rounded bg-light position-absolute"
        style="top: 40px; right: 0; z-index: 1000;">
        <h5>Playback Settings</h5>
        <div class="mb-3">
          <label for="playbackSpeedSlider" class="form-label">Playback Speed: {{ playbackSpeed }}x</label>
          <input type="range" id="playbackSpeedSlider" class="form-range" min="0.2" max="2" step="0.1"
            v-model="playbackSpeed" @input="updatePlaybackSpeed" />
        </div>
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="toggleVideoSync" v-model="sync">
          <label class="form-check-label" for="toggleVideoSync">Sync video with requests</label>
        </div>
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="toggleVideoDisplay" v-model="showVideo">
          <label class="form-check-label" for="toggleVideoDisplay">Show Video</label>
        </div>
      </div>
    </div>


    <!-- Video + RequestList SideBySide -->
    <div class="container mb-3">
      <HeadingWithAnker id="section-traffic">Network Requests</HeadingWithAnker>
      <div class="row">
        <div v-if="screenRecordingMeta && showVideo" class="col-auto" style="width: 350px;">
          <div class="video-container">
            <video ref="video-el" class="video-container" @timeupdate="syncRequestList()" width="300" controls>
              <source :src="screenRecordingMeta?.staticUrl">
              Your browser does not support HTML video.
            </video>
            <div class="clock"><font-awesome-icon :icon="['far', 'clock']" /> <span>{{ formatTime(new
              Date(currentVideoTimeStamp), true,
              true) }}</span>
            </div>
          </div>
        </div>
        <div ref="network-requests-list" v-if="networkTraffic" class="col accordion network-request-list">
          <div class="accordion-item" v-for="(request) in networkRequestList" :key="request.id"
            @click="setVideoTimeToRequestTimeStamp(request.timestampMS)">
            <h2 class="accordion-header accordion-flush" :id="getHTMLid('header', request.id)"
              :class="{ 'bg-warning': isEntryHighlighted(request.timestampMS) }">
              <button class="accordion-button collapsed d-flex align-items-center justify-content-between" type="button"
                data-bs-toggle="collapse" :data-bs-target="getHTMLid('#collapse', request.id)" aria-expanded="false"
                :aria-controls="getHTMLid('#collapse', request.id)">

                <!-- Badge for time -->
                <span class="badge me-2"
                  :class="isEntryHighlighted(request.timestampMS) ? 'bg-warning text-dark' : 'bg-secondary'">
                  <font-awesome-icon :icon="['fas', 'clock']" /> {{ formatTime(new Date(request.startedDateTime),
                    true,
                    true) }}
                </span>

                <!-- Flag Emoji -->
                <span v-if="request.receiverInfo?.ipWhoisInfo?.location?.flagEmoji" class="me-2">
                  {{ request.receiverInfo.ipWhoisInfo.location.flagEmoji }}
                </span>

                <!-- Hostname -->
                <span class="fw-bold me-2">{{ request.hostname }}</span>

                <!-- Request Method -->
                <span class="text-muted me-2">({{ request.method }})</span>

                <!-- Is on block list -->
                <span class="badge bg-danger me-2"
                  v-if="request.receiverInfo?.blockListHits && request.receiverInfo.blockListHits.length > 0">
                  <font-awesome-icon :icon="['fas', 'ban']" />
                </span>

                <!-- Is on block list -->
                <span class="badge bg-danger me-2" v-if="request.sensitiveData && request.sensitiveData.length > 0">
                  {{ request.sensitiveData.length }} <font-awesome-icon :icon="['fas', 'shield-halved']" />
                </span>

                <!-- Organization Name -->
                <span v-if="request.receiverInfo?.domainWhoisInfo?.orgName" class="badge bg-info text-dark">
                  {{ request.receiverInfo.domainWhoisInfo.orgName }}
                </span>

              </button>
            </h2>
            <div class="accordion-collapse collapse" :id="getHTMLid('collapse', request.id)">
              <div class="accordion-body">
                <div class="row mb-3 align-items-center" title="Full URL">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'link']" />
                  </div>
                  <div class="col-11">
                    <a :title="request.fullURL" :href="request.fullURL" target="_blank"
                      class="text-decoration-none text-primary">
                      {{ shortenStringForDisplay(request.fullURL, 50) }}
                    </a>
                  </div>
                </div>

                <div class="row mb-3 align-items-center" title="Company">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'building']" />
                  </div>
                  <div class="col-11">
                    <span :class="{ 'fst-italic': !request.receiverInfo?.domainWhoisInfo?.orgName }">{{
                      request.receiverInfo?.domainWhoisInfo?.orgName ?? 'Unknown' }}</span>
                  </div>
                </div>

                <div class="row mb-3 align-items-center" title="Server IP">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'server']" />
                  </div>
                  <div class="col-11">
                    <span :class="{ 'fst-italic': !request.serverIP }">{{ request.serverIP ?? 'Unknown' }}</span>
                  </div>
                </div>

                <div class="row mb-3 align-items-center" title="Hosting Provider">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'cloud']" />
                  </div>
                  <div class="col-11">
                    <a v-if="request.receiverInfo?.ipWhoisInfo?.org?.domain && request.receiverInfo.ipWhoisInfo.org.orgName"
                      :href="'https://' + request.receiverInfo.ipWhoisInfo.org.domain" target="_blank">{{
                        request.receiverInfo.ipWhoisInfo.org.orgName }}</a>
                    <span v-else :class="{ 'fst-italic': !request.receiverInfo?.ipWhoisInfo?.org?.orgName }">{{
                      request.receiverInfo?.ipWhoisInfo?.org?.orgName ?? 'N/A' }}</span>

                  </div>
                </div>

                <div class="row mb-3 align-items-center" title="IP Address Location">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'map-marker-alt']" />
                  </div>
                  <div class="col-11">
                    <span :class="{ 'fst-italic': !request.receiverInfo?.ipWhoisInfo?.location?.country }">
                      {{ request.receiverInfo?.ipWhoisInfo?.location?.country ?? 'Unknown' }}
                    </span>
                    <span class="ms-2" v-if="request.receiverInfo?.ipWhoisInfo?.location?.flagEmoji">
                      {{ request.receiverInfo.ipWhoisInfo?.location.flagEmoji }}
                    </span>
                  </div>
                </div>

                <div v-if="request.sensitiveData" class="row mb-3 align-items-center" title="Potential Sensitive Info">
                  <div class="col-1">
                    <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                  </div>
                  <div class="col-11">
                    <span class="badge bg-danger me-2" v-for="d in request.sensitiveData" :key="d"
                      :title="getDeviceDataValue(d)">{{ d }}</span>
                  </div>
                </div>

                <div class="d-grid gap-2">
                  <!-- Button to trigger modal -->
                  <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-toggle="modal"
                    data-bs-target="#requestDetailsModal" @click="showDetails(request)">
                    <font-awesome-icon :icon="['fas', 'info-circle']" title="View Full Request Info" /> View Full
                    Request
                    Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Request Details Modal -->
    <div class="modal fade modal-lg" id="requestDetailsModal" tabindex="-1" aria-labelledby="requestDetailsModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="requestDetailsModalLabel">Request details for: <strong>
                {{ selectedRequest?.hostname }}
              </strong></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <NetworkRequestDetails v-if="selectedRequest" :request-entry="selectedRequest.requestObj" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
// components
import NetworkRequestDetails from './NetworkRequestDetails.vue';
import HeadingWithAnker from '@/components/common/HeadingWithAnker.vue';

// types
import { useTemplateRef, ref, computed } from 'vue';
import { shortenStringForDisplay, formatTime, generateRequestIdentifier } from '@/utils';
import type { Har, Request } from 'har-format';
import { RecordingResultTypes, type DeviceData, type EnrichedReceivingEntity, type SensitiveDataLeakageRecords, type StaticResultFileMeta } from '@mopri/schema';
import { ApiError, fetchAnalysisResult, updateTrafficEnrichment } from '@/services/api';
import { onMounted } from 'vue';
import { onBeforeUnmount } from 'vue';
interface NetworkRequestCustom {
  id: string,
  method: string,
  startedDateTime: string,
  timestampMS: number,
  hostname: string,
  fullURL: string,
  sensitiveData?: string[],
  serverIP?: string,
  receiverInfo?: EnrichedReceivingEntity,
  requestObj: Request,
}

const getHTMLid = (prefix: string, uid: string) => `${prefix}-${uid}`

const props = defineProps<{ analysisId: string, enrichedReceivers?: EnrichedReceivingEntity[], deviceData?: DeviceData, print?: boolean }>();
const networkTraffic = ref<Har | undefined>();
const sensitiveDataLeakageRecords = ref<SensitiveDataLeakageRecords | undefined>();
const hostnameFilter = ref<string>('');
const selectedMethod = ref<"POST" | "GET" | 'ALL'>('ALL');
const filterVisible = ref<boolean>(false);
const filterWindow = ref<HTMLElement | null>(null);
const playbackSettingsWindow = ref<HTMLElement | null>(null);

const updateSelectedMethod = (method: "POST" | "GET" | "ALL") => {
  selectedMethod.value = method;
}
const toggleFilter = () => {
  // close other filter menus
  playbackSettingsVisible.value = false
  filterVisible.value = !filterVisible.value;
}
const playbackSettingsVisible = ref<boolean>(false);
const togglePlaybackSettings = () => {
  // close other filter menus
  filterVisible.value = false
  playbackSettingsVisible.value = !playbackSettingsVisible.value;
}
const clearFilters = () => {
  hostnameFilter.value = '';
  selectedMethod.value = 'ALL';
  toggleFilter();
}
const handleClickOutside = (event: MouseEvent) => {
  // if clicked outside of the filter area close it
  if (filterWindow.value && !filterWindow.value.contains(event.target as Node)) {
    filterVisible.value = false;
  }
  // if clicked outside of the playback settings area close it
  if (playbackSettingsWindow.value && !playbackSettingsWindow.value.contains(event.target as Node)) {
    playbackSettingsVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

const networkRequestList = computed<NetworkRequestCustom[]>(() => {
  const entries = networkTraffic.value?.log.entries;
  if (!Array.isArray(entries)) {
    return [];
  }
  let requests = entries.map((e): NetworkRequestCustom => {
    const hostname = new URL(e.request.url).hostname;
    var enrichedReceiver;
    if (props.enrichedReceivers) {
      enrichedReceiver = Object.values(props.enrichedReceivers).find(r => r?.ip === e.serverIPAddress && r?.hostname === hostname);
    }
    const id = generateRequestIdentifier(e);
    const sensitiveData = sensitiveDataLeakageRecords.value && sensitiveDataLeakageRecords.value[id] ? sensitiveDataLeakageRecords.value[id].dataCategoriesFound : undefined
    return {
      id,
      method: e.request.method,
      startedDateTime: e.startedDateTime,
      timestampMS: new Date(e.startedDateTime).getTime(),
      hostname, fullURL: e.request.url,
      sensitiveData,
      serverIP: e.serverIPAddress,
      requestObj: e.request,
      receiverInfo: enrichedReceiver
    };
  })

  // sort asc in time
  requests.sort((a, b) => a.timestampMS - b.timestampMS);

  // apply filters
  if (hostnameFilter.value) {
    requests = requests.filter(r => r.hostname.toLowerCase().includes(hostnameFilter.value.toLowerCase()));
  }

  if (selectedMethod.value !== 'ALL') {
    requests = requests.filter(r => r.method === selectedMethod.value);
  }
  return requests;
});
const errorMessage = ref<string | undefined>(undefined);
const screenRecordingMeta = ref<StaticResultFileMeta | undefined>();

const videoEl = useTemplateRef('video-el');
const playbackSpeed = ref<number>(1);
const sync = ref<boolean>(true);
const showVideo = ref<boolean>(true);
const networkRequestListEl = useTemplateRef('network-requests-list');
const currentEntryIndex = ref<number>();
const currentVideoTimeStamp = ref<number>(0);

const loadData = async () => {
  const analysisId = props.analysisId;
  if (analysisId) {
    const phase = 'collection';
    try {
      networkTraffic.value = await fetchAnalysisResult<Har>(analysisId, phase, RecordingResultTypes.NetworkHar);
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

    // get screenRecordingURL
    try {
      screenRecordingMeta.value = await fetchAnalysisResult<StaticResultFileMeta>(analysisId, phase, RecordingResultTypes.ScreenRecording);
      setVideoTimeToRequestTimeStamp(networkRequestList.value[0].timestampMS);
    } catch (error) {
      console.error(error);
    }

    // get payload enrichments
    try {
      sensitiveDataLeakageRecords.value = await fetchAnalysisResult<SensitiveDataLeakageRecords>(analysisId, "enrichment", RecordingResultTypes.SensitiveDataLeakageRecords);
    } catch (error) {
      console.error(error);
    }
  }
}
loadData();

const updatePlaybackSpeed = () => {
  if (!videoEl.value) return console.error("Not able to update playback speed - videoElement not available!");
  videoEl.value.playbackRate = playbackSpeed.value;
}

const syncRequestList = () => {
  if (sync.value) {
    if (videoEl.value && networkRequestList.value && screenRecordingMeta.value) {
      const currentVideoOffset = videoEl.value.currentTime * 1000;
      // calculate timestamp based on the startTime of the video and its current offset in milliseconds
      currentVideoTimeStamp.value = screenRecordingMeta.value.startCaptureTime * 1000 + currentVideoOffset;

      // get index of the last element that is not yet after the videoTimeStamp
      const index = networkRequestList.value.findIndex(entry => entry.timestampMS > currentVideoTimeStamp.value) - 1;
      if (index !== currentEntryIndex.value) {
        currentEntryIndex.value = index;
        scrollToEntry(index);
      }
    }
  }
}
const scrollToEntry = (index: number) => {
  const entryList = networkRequestListEl.value;
  if (entryList) {
    const entry = entryList.children[index];
    if (entry) {
      // Use getBoundingClientRect to calculate the position
      const entryRect = entry.getBoundingClientRect();
      const listRect = entryList.getBoundingClientRect();
      const scrollPosition = entryRect.top - listRect.top + entryList.scrollTop;
      entryList.scroll({ top: scrollPosition, behavior: 'smooth' });
    }
  }
}

const setVideoTimeToRequestTimeStamp = (timestampMS: number) => {
  // set video to start from the time of the first network request
  if (videoEl.value && screenRecordingMeta.value?.startCaptureTime) {
    videoEl.value.currentTime = (timestampMS / 1000 - screenRecordingMeta.value?.startCaptureTime);
  }
}

const isEntryHighlighted = (timestampMS: number) => {
  // highlight all requests that where made in the last second from the current video time 
  return (timestampMS > (currentVideoTimeStamp.value - 1000)) && (timestampMS <= (currentVideoTimeStamp.value))
}

const selectedRequest = ref<NetworkRequestCustom>();
const showDetails = (request: NetworkRequestCustom) => {
  selectedRequest.value = request;
}

const getDeviceDataValue = (key: string) => {
  if (props.deviceData) {
    if (Object.keys(props.deviceData).includes(key)) {
      return props.deviceData[key as keyof DeviceData];
    }
  }
  return undefined;
}

const enrichmentUpdateRunning = ref<boolean>(false);
const executeTrafficEnrichmentUpdate = async () => {
  if (props.analysisId) {
    try {
      enrichmentUpdateRunning.value = true;
      await updateTrafficEnrichment(props.analysisId);
      location.reload();
    } catch (e) {
      console.error(e);
    }
    finally {
      enrichmentUpdateRunning.value = false;
    }
  }

}

</script>
<style scoped>
.video-container {
  position: relative;
  /* Position relative for absolute positioning of clock */
}

.clock {
  position: absolute;
  top: 5px;
  left: 5px;
  color: white;
  /* Change color for visibility */
  background-color: rgba(0, 0, 0, 0.8);
  /* Semi-transparent background */
  padding: 5px;
  border-radius: 5px;
  font-size: 1.2em;
}

.request-entry {
  border-radius: 0.25rem;
}

.network-request-list {
  overflow-y: scroll;
  height: 80vh;
}
</style>
