import type { JobResult, PipelineContext } from '../../types.js'
import { wait } from '../utils.js'

export async function finalizeResultStep(
  context: PipelineContext,
): Promise<Partial<JobResult>> {
  await wait(1000)
  context.updateProgress(100)

  const confidence = Math.max(62, Math.min(96, Math.round(60 + context.inputValue / 2)))

  return {
    confidence,
  }
}
