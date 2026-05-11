export type JobStatus = 'queued' | 'processing' | 'done' | 'failed'

export interface JobResult {
  title: string
  summary: string
  recommendation: string
  confidence: number
}

export interface JobRecord {
  id: string
  selection: string
  inputValue: number
  status: JobStatus
  progress: number
  createdAt: string
  result: JobResult | null
  errorMessage: string | null
}
