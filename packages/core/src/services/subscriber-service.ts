import type { ThemeSubscriber } from '../domain/subscriber.js'
import type { SubscriberRepository, ThemeRepository } from '../ports/repositories.js'

export interface SubscriberService {
  addSubscriber(input: { themeSlug: string; email: string; now?: string }): Promise<ThemeSubscriber>
  listSubscribers(input: { themeSlug: string }): Promise<ThemeSubscriber[]>
  removeSubscriber(input: { themeSlug: string; email: string }): Promise<void>
}

export function createSubscriberService(
  themeRepository: ThemeRepository,
  subscriberRepository: SubscriberRepository,
): SubscriberService {
  return {
    async addSubscriber({ themeSlug, email }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      return subscriberRepository.add(theme.id, email)
    },

    async listSubscribers({ themeSlug }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      return subscriberRepository.listByTheme(theme.id)
    },

    async removeSubscriber({ themeSlug, email }) {
      const theme = await getThemeBySlug(themeRepository, themeSlug)
      return subscriberRepository.remove(theme.id, email)
    },
  }
}

async function getThemeBySlug(themeRepository: ThemeRepository, slug: string) {
  const theme = await themeRepository.findBySlug(slug)

  if (!theme) {
    throw new Error(`Theme ${slug} was not found.`)
  }

  return theme
}
