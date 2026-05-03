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
    async createTheme({ slug, name, workflowName }) {
      assertWorkflowExists(workflowRegistry, workflowName)

      return themeRepository.create({
        slug,
        name,
        workflowName,
      })
    },

    async listThemes() {
      return themeRepository.list()
    },

    async updateTheme({ slug, name, workflowName, enabled }) {
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

      return themeRepository.updateBySlug(slug, {
        ...(name !== undefined ? { name } : {}),
        ...(workflowName !== undefined ? { workflowName } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
      })
    },
  }
}

function assertWorkflowExists(workflowRegistry: WorkflowRegistry, workflowName: string): void {
  if (!workflowRegistry.getWorkflow(workflowName)) {
    throw new Error(`Workflow ${workflowName} is not registered.`)
  }
}
