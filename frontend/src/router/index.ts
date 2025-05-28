/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AnalysesCatalogView from '@/views/AnalysesCatalogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Mobile Privacy Analysis'
      }
    },
    {
      path: '/analyses',
      name: 'analysesCatalog',
      component: AnalysesCatalogView,
      meta: {
        title: 'Analyses Catalog'
      }
    },
    {
      path: '/analyses/create',
      name: 'createAnalysis',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AnalysisCreationView.vue'),
      meta: {
        title: 'Analysis Setup'
      }
    },
    {
      path: '/analyses/live-log',
      name: 'analysisLog',
      component: () => import('../views/AnalysisLogView.vue'),
      meta: {
        title: 'Analysis Log'
      }
    },
    {
      path: '/analyses/result/:id',
      name: 'result',
      component: () => import('../views/ResultView.vue'),
      meta: {
        title: 'Interactive Report'
      }
    },
    {
      path: '/analyses/staticReport/:id',
      name: 'staticReport',
      component: () => import('../views/StaticReportView.vue'),
      meta: {
        title: 'Static Report'
      }
    }
  ]
})

router.beforeEach((to, from) => {
  const title = to.meta?.title;
  document.title = title ? `${title} • mopri` : 'mopri'
})

export default router
