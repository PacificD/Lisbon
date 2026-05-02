import type { WorkflowRunner } from '@lisbon/core'

export interface WorkflowMetadata {
  name: string
  displayName: string
  description: string
}

export type WorkflowInput = Parameters<WorkflowRunner['run']>[0]

export interface WorkflowModule extends WorkflowRunner {
  metadata: WorkflowMetadata
}
