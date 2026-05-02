import type { WorkflowRunner } from '@lisbon/core'

export interface WorkflowMetadata {
  name: string
  displayName: string
  description: string
}

export interface WorkflowDefinition extends WorkflowRunner {
  metadata: WorkflowMetadata
}
