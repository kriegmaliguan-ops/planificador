'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Verifica que el caller sea un profe. Devuelve error string si no. */
async function verificarProfe(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'No autenticado.'
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return 'Sin permisos.'
  return null
}

// ── Eliminar registro de progreso (historial) ────────────────────────────────

export async function eliminarRegistroHistorialProfe(id: string): Promise<{ error?: string }> {
  const err = await verificarProfe()
  if (err) return { error: err }
  const admin = createAdminClient()
  const { error } = await admin.from('registros_progreso').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar.' }
  return {}
}

// ── Eliminar registro de bienestar / sueño ───────────────────────────────────

export async function eliminarBienestarProfe(id: string): Promise<{ error?: string }> {
  const err = await verificarProfe()
  if (err) return { error: err }
  const admin = createAdminClient()
  const { error } = await admin.from('registros_bienestar').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar.' }
  return {}
}
