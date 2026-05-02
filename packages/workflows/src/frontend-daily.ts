import type { WorkflowDefinition } from './types.js'

export const frontendDailyWorkflow: WorkflowDefinition = {
  metadata: {
    name: 'frontend-daily',
    displayName: 'Frontend Daily',
    description: 'Curated frontend links for the daily Lisbon newsletter issue.',
  },
  async run({ issueDate }) {
    return {
      subject: `Frontend Daily for ${issueDate}`,
      previewText: 'Three frontend links worth reviewing today.',
      intro: 'A compact issue covering platform, tooling, and design system updates.',
      items: [
        {
          title: 'View Transitions Level 2 lands in more browsers',
          source: 'Chrome Developers',
          url: 'https://developer.chrome.com/docs/web-platform/view-transitions/',
          summary: 'The API keeps getting more practical for route changes and shared element motion.',
          tags: ['platform', 'animation'],
        },
        {
          title: 'Type-safe design tokens without a build maze',
          source: 'Design Systems Weekly',
          url: 'https://example.com/design-tokens',
          summary: 'A practical pattern for shipping tokens across apps with fewer generated artifacts.',
          author: 'Lisbon Editorial',
          tags: ['design-systems', 'tooling'],
        },
        {
          title: 'Shipping React compiler-friendly component APIs',
          source: 'React Notes',
          url: 'https://example.com/react-compiler-apis',
          summary: 'Small API constraints now can prevent expensive rewrites when compiler adoption expands.',
          publishedAt: '2026-05-02T07:30:00.000Z',
          tags: ['react', 'performance'],
        },
      ],
    }
  },
}
