/*
 * SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import ky, { HTTPError } from 'ky'

import type {
  AnalysisMeta,
  RecordingMeta,
  RecordingResultTypes,
  AnalysisConfig,
  AndroidVersion,
  AppPackageInfo,
  AppPackageInfoList,
  AvdInfo,
  AvdOptions,
  HardwareProfile
} from '@mopri/schema'

export class ApiError extends Error {
  public statusCode: number
  public body: any

  constructor(statusCode: number, message: string, body: any) {
    super(message)
    this.statusCode = statusCode
    this.body = body
    this.name = 'ApiError'
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const apiClient = ky.create({
  retry: 0,
  prefixUrl: API_BASE_URL
})

// Function to fetch all app packages
export const fetchAppPackages = async (): Promise<AppPackageInfoList> => {
  try {
    console.log(API_BASE_URL)
    const response: { uploadedPackages: AppPackageInfo[] } = await apiClient
      .get('appPackages')
      .json()
    return response.uploadedPackages
  } catch (error) {
    console.error('Error fetching app packages:', error)
    throw error // Rethrow the error for further handling
  }
}

// Function to fetch a specific app package by ID
export const fetchAppPackageById = async (id: string): Promise<AppPackageInfo> => {
  try {
    const response = await apiClient.get(`appPackages/${id}`).json<AppPackageInfo>()
    return response
  } catch (error) {
    console.error(`Error fetching app package with ID ${id}:`, error)
    throw error // Rethrow the error for further handling
  }
}

// Function to upload a new app package
export const uploadAppPackage = async (appPackageFile: File): Promise<string> => {
  const formData = new FormData()
  formData.append('appPackage', appPackageFile)
  try {
    const response = await apiClient.post('appPackages', {
      body: formData
    })
    return response.text()
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const startNewAnalysis = async (
  analysisConfig: AnalysisConfig
): Promise<ReadableStreamDefaultReader> => {
  try {
    const response = await apiClient.post('analysis', { json: analysisConfig, timeout: false })
    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
    if (!reader) {
      throw new Error('Could not extract stream reader')
    }
    return reader
  } catch (error) {
    console.error('Error starting analysis:', error)
    throw error
  }
}

export const stopAnalysis = async (): Promise<void> => {
  try {
    const response = await apiClient.delete('analysis/runningRecordings/networkTraffic').json()
  } catch (error) {
    console.error('Error stopping analysis:', error)
    throw error
  }
}

export const fetchAnalysisConfig = async (analysisId: string): Promise<AnalysisMeta> => {
  try {
    const response: AnalysisMeta = await apiClient
      .get(`analysis/${analysisId}`)
      .json<AnalysisMeta>()
    return response
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json<AnalysisMeta>().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const fetchRecordingsMeta = async (analysisId: string) =>
  fetchAnalysisResultStatic<RecordingMeta>(analysisId, 'collection', 'recordings.json')

export const fetchAnalysisResultStatic = async <T>(
  analysisId: string,
  phase: 'collection' | 'enrichment',
  filename: string
): Promise<T> => {
  try {
    const response = await apiClient.get(`result/${analysisId}/${phase}/${filename}`).json<T>()
    return response
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}
export const fetchAnalysisResult = async <T>(
  analysisId: string,
  phase: 'collection' | 'enrichment',
  resultType: RecordingResultTypes
): Promise<T> => {
  try {
    const response = await apiClient
      .get(`analysis/result/${analysisId}/${phase}/${resultType}`)
      .json<T>()
    return response
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const fetchNetworkTrafficRecordingMethods = async (): Promise<string[]> => {
  try {
    const response = await apiClient.get('config/networkTrafficRecordingMethods').json<string[]>()
    return response
  } catch (error) {
    console.error('Error fetching networkTrafficRecordingMethod', error)
    throw error
  }
}

export const fetchExistingEmulators = async (): Promise<AvdInfo[]> => {
  try {
    const response = await apiClient.get('emulators').json<AvdInfo[]>()
    return response
  } catch (error) {
    console.error('Error fetching existing emulators', error)
    throw error
  }
}

export const fetchHardwareProfiles = async (): Promise<HardwareProfile[]> => {
  try {
    const response = await apiClient.get('emulators/hardware-profiles').json<HardwareProfile[]>()
    return response
  } catch (error) {
    console.error('Error fetching emulator harware profiles', error)
    throw error
  }
}
export const fetchAndroidVersions = async (): Promise<AndroidVersion[]> => {
  try {
    const response = await apiClient.get('emulators/api-levels').json<AndroidVersion[]>()
    return response
  } catch (error) {
    console.error('Error fetching api levels', error)
    throw error
  }
}

export const createAVD = async (avdOptions: AvdOptions) => {
  try {
    const response = await apiClient.post('emulators', { json: avdOptions })
    return response
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const getFullStaticResultURL = (
  analysisId: string,
  phase: 'collecttion' | 'enrichment',
  filename: string
) => {
  return `${API_BASE_URL}/result/${analysisId}/${phase}/${filename}`
}

export const getResultArchiveDownloadURL = (analysisId: string) => {
  return `${API_BASE_URL}/analysis/download/${analysisId}`
}

export const deleteAnalysis = async (analysisId: string) => {
  try {
    await apiClient.delete(`analysis/${analysisId}`).json()
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const fetchAnalysisList = async (): Promise<AnalysisMeta[]> => {
  try {
    const response: AnalysisMeta[] = await apiClient.get('analysis').json<AnalysisMeta[]>()
    return response
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}

export const updateTrafficEnrichment = async (analysisId: string) => {
  try {
    await apiClient.patch(`analysis/updateTrafficEnrichment/${analysisId}`)
  } catch (error) {
    if (error instanceof HTTPError) {
      // Handle HTTP errors
      const statusCode = error.response.status
      const body = await error.response.json().catch(() => ({})) // Safely parse the body
      throw new ApiError(statusCode, error.message, body)
    } else {
      // Handle other types of errors
      throw new ApiError(500, 'An unexpected error occurred', error)
    }
  }
}
