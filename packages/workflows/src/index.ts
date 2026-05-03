import type { WorkflowRegistry } from '@lisbon/core'

import { frontendDailyWorkflow } from './frontend-daily.js'
import type { WorkflowModule } from './types.js'

const defaultWorkflows = [frontendDailyWorkflow]

export interface RegisteredWorkflowRegistry extends WorkflowRegistry {
  getWorkflow(name: string): WorkflowModule
}

export function createWorkflowRegistry(workflows: WorkflowModule[] = defaultWorkflows): RegisteredWorkflowRegistry {
  const byName = new Map<string, WorkflowModule>()

  for (const workflow of workflows) {
    if (byName.has(workflow.metadata.name)) {
      throw new Error(`Workflow ${workflow.metadata.name} is already registered.`)
    }

    byName.set(workflow.metadata.name, workflow)
  }

  return {
    getWorkflow(name) {
      const workflow = byName.get(name)

      if (!workflow) {
        throw new Error(`Workflow ${name} is not registered.`)
      }

      return workflow
    },
  }
}

export const workflowRegistry = createWorkflowRegistry()
export { frontendDailyWorkflow } from './frontend-daily.js'
export type { WorkflowInput, WorkflowMetadata, WorkflowModule } from './types.js'
