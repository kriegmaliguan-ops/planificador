import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service-role (bypasses RLS).
 * Solo usar en Server Actions después de verificar el rol manualmente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
