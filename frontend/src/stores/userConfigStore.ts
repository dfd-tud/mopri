/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import type { AnalysisConfig, DeviceType } from '@mopri/schema'
import { DeviceTypes, TrafficRecordingMethod } from '@mopri/schema'

export const useUserConfigStore = defineStore('userConfig', {
  state: (): AnalysisConfig => ({
    analysisName: '',
    appPackageStorageId: '',
    note: '',
    staticConfig: {
      enableExodusModule: true
    },
    dynamicConfig: {
      deviceType: 'physical',
      emulatorOptions: {
        emulatorName: ''
      },
      enableTrafficRecording: true,
      trafficRecordingOptions: {
        trafficRecordingMethod: TrafficRecordingMethod.TweaselBasic,
        enableDeviceDataCapture: true,
        enableScreenRecording: true
      }
    }
  }),
  getters: {
    isIncomplete: (state) =>
      !state.analysisName ||
      (state.dynamicConfig.enableTrafficRecording &&
        state.dynamicConfig.deviceType === 'emulator' &&
        !state.dynamicConfig.emulatorOptions?.emulatorName)
  },
  actions: {
    setAppPackageStorageId(storageId: string) {
      this.appPackageStorageId = storageId
    },
    setAnalysisName(newName: string) {
      this.analysisName = newName
    },
    setNote(newNote: string) {
      this.note = newNote
    },
    setTrafficRecordingMethod(method: TrafficRecordingMethod) {
      if (this.dynamicConfig.trafficRecordingOptions) {
        this.dynamicConfig.trafficRecordingOptions.trafficRecordingMethod = method
      }
    },
    setDeviceType(type: DeviceType) {
      if (DeviceTypes.includes(type)) this.dynamicConfig.deviceType = type
      else throw new Error('Device type not valid')
    },
    setEmulatorName(name: string) {
      if (this.dynamicConfig.emulatorOptions) {
        this.dynamicConfig.emulatorOptions.emulatorName = name
      }
    },
    // disable/enable statice exodus analysis
    toggleStaticModuleExodus() {
      this.staticConfig.enableExodusModule = !this.staticConfig.enableExodusModule
    },
    toggleTrafficRecording() {
      this.dynamicConfig.enableTrafficRecording = !this.dynamicConfig.enableTrafficRecording
    },
    toggleScreenRecording() {
      if (this.dynamicConfig.trafficRecordingOptions) {
        this.dynamicConfig.trafficRecordingOptions.enableScreenRecording =
          !this.dynamicConfig.trafficRecordingOptions?.enableScreenRecording
      }
    },
    overwriteStore(newState: AnalysisConfig) {
      this.$patch(newState) // Overwrites the state with the newState object
    }
  }
})
