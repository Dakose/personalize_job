import type { JobResult, PipelineContext } from '../../types.js'
import { wait } from '../utils.js'

export async function calculateRecommendationStep(
  context: PipelineContext,
): Promise<Partial<JobResult>> {
  await wait(1200)
  context.updateProgress(70)

  const roundedValue = Math.round(context.inputValue)

  return {
    recommendation: `Start with a simple weekly target near ${roundedValue} and review progress every 7 days.`,
  }
}
