import type { JobResult, PipelineContext } from '../types.js'
import { analyzeSelectionStep } from './steps/analyzeSelectionStep.js'
import { calculateRecommendationStep } from './steps/calculateRecommendationStep.js'
import { finalizeResultStep } from './steps/finalizeResultStep.js'

type PipelineStep = (context: PipelineContext) => Promise<Partial<JobResult>>

const pipelineSteps: PipelineStep[] = [
  analyzeSelectionStep,
  calculateRecommendationStep,
  finalizeResultStep,
]

export async function runPipeline(context: PipelineContext): Promise<JobResult> {
  const partialResult: Partial<JobResult> = {}

  for (const step of pipelineSteps) {
    Object.assign(partialResult, await step(context))
  }

  return {
    title: partialResult.title ?? 'Your result is ready',
    summary:
      partialResult.summary ??
      `A mock pipeline completed successfully for ${context.selection}.`,
    recommendation:
      partialResult.recommendation ??
      'Keep the next step small and measurable so progress is easy to sustain.',
    confidence: partialResult.confidence ?? 80,
  }
}
