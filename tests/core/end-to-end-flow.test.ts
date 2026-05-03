import { describe, expect, it } from 'vitest'

import {
  createDraftService,
  createSendService,
  createSubscriberService,
  createThemeService,
} from '../../packages/core/src/index.ts'

describe('newsletter orchestration surface', () => {
  it('exports the top-level core service factories used by the local app shells', () => {
    expect(createDraftService).toBeTypeOf('function')
    expect(createSendService).toBeTypeOf('function')
    expect(createSubscriberService).toBeTypeOf('function')
    expect(createThemeService).toBeTypeOf('function')
  })
})
