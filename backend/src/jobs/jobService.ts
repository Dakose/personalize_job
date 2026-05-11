import { runPipeline } from '../pipeline/runPipeline.js'
import type { CreateJobInput, JobRecord } from '../types.js'
import { JobBroadcaster } from './jobBroadcaster.js'
import { JobRepository } from './jobRepository.js'

export class JobService {
  constructor(
    private readonly repository: JobRepository,
    private readonly broadcaster: JobBroadcaster,
  ) {}

  createJob(input: CreateJobInput): JobRecord {
    const job = this.repository.create(input)
    this.broadcaster.publish(job)

    setTimeout(() => {
      void this.processJob(job.id)
    }, 0)

    return job
  }

  getJob(jobId: string) {
    return this.repository.findById(jobId)
  }

  private async processJob(jobId: string) {
    const currentJob = this.repository.findById(jobId)

    if (!currentJob || currentJob.status !== 'queued') {
      return
    }

    const processingJob = this.repository.update(jobId, {
      status: 'processing',
      progress: 5,
      errorMessage: null,
    })

    if (processingJob) {
      this.broadcaster.publish(processingJob)
    }

    try {
      const result = await runPipeline({
        jobId,
        selection: currentJob.selection,
        inputValue: currentJob.inputValue,
        updateProgress: (progress) => {
          const updatedJob = this.repository.update(jobId, {
            status: 'processing',
            progress,
          })

          if (updatedJob) {
            this.broadcaster.publish(updatedJob)
          }
        },
      })

      const completedJob = this.repository.update(jobId, {
        status: 'done',
        progress: 100,
        result,
        errorMessage: null,
      })

      if (completedJob) {
        this.broadcaster.publish(completedJob)
      }
    } catch (error) {
      const failedJob = this.repository.update(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unexpected pipeline error',
      })

      if (failedJob) {
        this.broadcaster.publish(failedJob)
      }
    }
  }
}
