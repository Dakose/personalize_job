import type { JobResult, PipelineContext } from '../../types.js'
import { wait } from '../utils.js'

export async function analyzeSelectionStep(
  context: PipelineContext,
): Promise<Partial<JobResult>> {
  await wait(800)
  context.updateProgress(30)

  return {
    title: `Plan drafted for ${context.selection}`,
    summary: `We processed your goal around "${context.selection}" and aligned it with your target value of ${context.inputValue}.`,
  }
}
