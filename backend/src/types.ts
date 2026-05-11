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

export interface CreateJobInput {
  selection: string
  inputValue: number
}

export interface PipelineContext {
  jobId: string
  selection: string
  inputValue: number
  updateProgress: (progress: number) => void
}
