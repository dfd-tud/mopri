/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import 'bootstrap/dist/js/bootstrap.min.js'
import './assets/main.css'
import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core'

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/* import specific icons */
import {
  faPlus,
  faEye,
  faRetweet,
  faTrash,
  faClock as fasClock,
  faLink,
  faBuilding,
  faServer,
  faCloud,
  faMapMarkerAlt,
  faExclamationTriangle,
  faInfoCircle,
  faSortUp,
  faSortDown,
  faCopy,
  faCheck,
  faFilter,
  faChevronUp,
  faChevronDown,
  faCog,
  faShieldHalved,
  faBan,
  faEarthAmericas,
  faArrowRightArrowLeft,
  faNetworkWired,
  faMinus,
  faExternalLinkAlt,
  faLock,
  faUserNinja,
  faPrint,
  faKey,
  faList,
  faMobile,
  faCode,
  faSync,
  faChartLine,
  faFileAlt,
  faCogs,
  faMobileScreenButton,
  faPlay,
  faUser,
  faStickyNote,
  faCheckCircle,
  faTrafficLight,
  faDesktop,
  faBox,
  faXmark,
  faSearch,
  faDownload,
  faClone,
  faClockRotateLeft,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'
import {
  faClock as farClock,
  faFileLines,
  faQuestionCircle
} from '@fortawesome/free-regular-svg-icons'

import { faAndroid } from '@fortawesome/free-brands-svg-icons'

/* add icons to the library */
library.add(
  faPlus,
  faEye,
  faRetweet,
  faTrash,
  fasClock,
  farClock,
  faLink,
  faBuilding,
  faServer,
  faCloud,
  faMapMarkerAlt,
  faExclamationTriangle,
  faInfoCircle,
  faSortUp,
  faSortDown,
  faCopy,
  faCheck,
  faFilter,
  faChevronUp,
  faChevronDown,
  faCog,
  faShieldHalved,
  faBan,
  faEarthAmericas,
  faArrowRightArrowLeft,
  faServer,
  faNetworkWired,
  faMinus,
  faExternalLinkAlt,
  faLock,
  faUserNinja,
  faPrint,
  faKey,
  faList,
  faMobile,
  faFileLines,
  faCode,
  faSync,
  faChartLine,
  faFileAlt,
  faCogs,
  faMobileScreenButton,
  faAndroid,
  faPlay,
  faUser,
  faStickyNote,
  faCheckCircle,
  faTrafficLight,
  faDesktop,
  faBox,
  faXmark,
  faSearch,
  faQuestionCircle,
  faDownload,
  faClone,
  faClockRotateLeft,
  faArrowLeft
)

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')
