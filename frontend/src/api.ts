import type { JobRecord } from './types'

const DEFAULT_API_BASE_URL = 'http://localhost:3001'

function normalizeHttpUrl(value: string | undefined, fallback: string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return fallback
  }

  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`

  return withProtocol.replace(/\/+$/, '')
}

function normalizeWsUrl(value: string | undefined, fallbackHttpUrl: string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return fallbackHttpUrl.replace(/^http/i, (protocol: string) =>
      protocol.toLowerCase() === 'https' ? 'wss' : 'ws',
    )
  }

  const withProtocol = /^(wss?|https?):\/\//i.test(trimmedValue)
    ? trimmedValue
    : `wss://${trimmedValue}`

  return withProtocol.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://').replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeHttpUrl(
  import.meta.env.VITE_API_BASE_URL,
  DEFAULT_API_BASE_URL,
)
export const WS_BASE_URL = normalizeWsUrl(import.meta.env.VITE_WS_BASE_URL, API_BASE_URL)

interface JobResponse {
  job: JobRecord
}

export async function createJob(input: { selection: string; inputValue: number }) {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to create a job')
  }

  return (await response.json()) as JobResponse
}

export async function getJob(jobId: string) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`)

  if (!response.ok) {
    throw new Error('Failed to load the current job status')
  }

  return (await response.json()) as JobResponse
}
