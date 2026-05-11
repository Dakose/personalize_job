import type { JobRecord } from './types'

const DEFAULT_API_BASE_URL = 'http://localhost:3001'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL?.trim() ||
  API_BASE_URL.replace(/^http/i, (protocol: string) =>
    protocol.toLowerCase() === 'https' ? 'wss' : 'ws',
  )

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
