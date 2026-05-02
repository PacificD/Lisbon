import { randomUUID } from 'node:crypto'

import type { Theme } from '../domain/theme.js'
import type { ThemeRepository } from '../ports/repositories.js'
import type { WorkflowRegistry } from '../ports/runtime.js'

export interface ThemeService {
  createTheme(input: { slug: string; name: string; workflowName: string; now?: string }): Promise<Theme>
  listThemes(): Promise<Theme[]>
  updateTheme(input: {
    slug: string
    name?: string
    workflowName?: string
    enabled?: boolean
    now?: string
  }): Promise<Theme>
}

export function createThemeService(
  themeRepository: ThemeRepository,
  workflowRegistry: WorkflowRegistry,
): ThemeService {
  return {
    async createTheme({ slug, name, workflowName, now = new Date().toISOString() }) {
      assertWorkflowExists(workflowRegistry, workflowName)

      return themeRepository.create({
        id: randomUUID(),
        slug,
        name,
        workflowName,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    },

    async listThemes() {
      return themeRepository.list()
    },

    async updateTheme({ slug, name, workflowName, enabled, now = new Date().toISOString() }) {
      const existingTheme = await themeRepository.findBySlug(slug)

      if (!existingTheme) {
        throw new Error(`Theme ${slug} was not found.`)
      }

      if (workflowName !== undefined) {
        if (workflowName.trim().length === 0) {
          throw new Error('Workflow name cannot be empty.')
        }

        assertWorkflowExists(workflowRegistry, workflowName)
      }

      return themeRepository.update({
        ...existingTheme,
        name: name ?? existingTheme.name,
        workflowName: workflowName ?? existingTheme.workflowName,
        enabled: enabled ?? existingTheme.enabled,
        updatedAt: now,
      })
    },
  }
}

function assertWorkflowExists(workflowRegistry: WorkflowRegistry, workflowName: string): void {
  if (!workflowRegistry.getWorkflow(workflowName)) {
    throw new Error(`Workflow ${workflowName} is not registered.`)
  }
}
