import type { WorkflowRegistry } from '@lisbon/core'

import { frontendDailyWorkflow } from './frontend-daily.js'
import type { WorkflowDefinition } from './types.js'

const defaultWorkflows = [frontendDailyWorkflow]

export function createWorkflowRegistry(workflows: WorkflowDefinition[] = defaultWorkflows): WorkflowRegistry {
  const byName = new Map<string, WorkflowDefinition>()

  for (const workflow of workflows) {
    if (byName.has(workflow.metadata.name)) {
      throw new Error(`Workflow ${workflow.metadata.name} is already registered.`)
    }

    byName.set(workflow.metadata.name, workflow)
  }

  return {
    getWorkflow(name) {
      return byName.get(name)
    },
  }
}

export { frontendDailyWorkflow } from './frontend-daily.js'
export type { WorkflowDefinition, WorkflowMetadata } from './types.js'
