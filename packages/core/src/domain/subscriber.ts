import { SubscriberRecordSchema, type SubscriberRecord } from '../../../shared/src/schemas.ts'

export function createSubscriberRecord(input: SubscriberRecord): SubscriberRecord {
  return SubscriberRecordSchema.parse(input)
}
