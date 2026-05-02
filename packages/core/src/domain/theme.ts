import { ThemeRecordSchema, type ThemeRecord } from '../../../shared/src/schemas.ts'

export function createThemeRecord(input: ThemeRecord): ThemeRecord {
  return ThemeRecordSchema.parse(input)
}
