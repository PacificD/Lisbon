import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

export function createSupabaseAdminClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
