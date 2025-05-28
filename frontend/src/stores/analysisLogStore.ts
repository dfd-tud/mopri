/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { useUserConfigStore } from './userConfigStore'
import { startNewAnalysis } from '@/services/api'
import type { AnalysisConfig, Log } from '@mopri/schema'

export type AnalysisState = 'notStarted' | 'running' | 'stopped'

export const useAnalysisLogStore = defineStore('analysisLog', {
  state: () => ({
    logs: [] as Log[],
    analysisId: null as string | null,
    analysisState: 'notStarted' as AnalysisState // Initial state
  }),
  actions: {
    async startAnalysis() {
      this.resetAnalysis()
      this.analysisState = 'running'
      // start analysis in backend
      const analysisConfigState: AnalysisConfig = useUserConfigStore().$state
      const reader = await startNewAnalysis(analysisConfigState)
      // subscribe to receive analysis log updates
      this.subscribeLog(reader)
    },
    stopAnalysis() {
      this.analysisState = 'stopped'
    },
    resetAnalysis() {
      // reset any previous state
      this.$reset()
    },
    /**
     * Subscribes to a log stream and processes incoming messages.
     *
     * This function reads from a ReadableStreamDefaultReader, handling
     * multiple messages that may be combined in a single read. Each
     * message is parsed to determine the event type and associated log data,
     * which is then processed accordingly and added to the state's log array.
     *
     * @param reader - The reader for the ReadableStream from which to read log messages.
     *
     * @returns A promise that resolves when the stream has been fully read and processed.
     */
    async subscribeLog(reader: ReadableStreamDefaultReader) {
      if (reader) {
        while (true) {
          const { value, done } = await reader.read()
          if (value) {
            // Split the received value by new lines (sometimes multiple messages are combined in one read)
            const messages = value.split('\n\n')
            for (const message of messages) {
              // Check if the message is not empty
              if (message.trim()) {
                try {
                  const { event, data } = parseSSEMessage(message)
                  if (data) {
                    switch (event) {
                      case 'NEW_LOG':
                        // add new log entry
                        this.logs.push(data)
                        break
                      case 'DONE':
                        this.analysisId = data.content
                        this.stopAnalysis()
                        break
                    }
                  }
                } catch (e) {
                  console.error(e)
                }
              }
            }
          }
          if (done) break
        }
      }
    }
  }
})

const parseSSEMessage = (message: string) => {
  // Use a regular expression to match the event and data
  const eventMatch = message.match(/event:\s*(.+)/)
  const dataMatch = message.match(/data:\s*(.+)/)

  // Check if matches were found
  if (!eventMatch || !dataMatch) {
    throw new Error('Invalid log string format')
  }

  // Extract the event and data
  const event = eventMatch[1].trim() // Get the event part
  const dataString = dataMatch[1].trim() // Get the data part

  // Parse the data string into an object
  const data: Log = JSON.parse(dataString)

  // Return the result as an object
  return { event, data }
}
