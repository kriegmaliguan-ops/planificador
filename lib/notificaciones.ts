'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Inserta una notificación para un usuario.
 * Usa el admin client para evitar restricciones de RLS.
 * Silencia errores — las notifs son best-effort.
 */
export async function crearNotificacion(
  userId: string,
  tipo: string,
  titulo: string,
  mensaje?: string
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('notificaciones' as any).insert({
      user_id: userId,
      tipo,
      titulo,
      mensaje: mensaje ?? null,
    })
  } catch (e) {
    console.error('crearNotificacion error:', e)
  }
}
