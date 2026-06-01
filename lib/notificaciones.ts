'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { enviarPushAUsuario } from '@/lib/push'

const URLS_POR_TIPO: Record<string, string> = {
  rutina_nueva: '/rutina',
  mensaje_profe: '/rutina',
  bienvenida: '/perfil',
  plan_reactivado: '/rutina',
}

/**
 * Inserta una notificación para un usuario y dispara push si está suscripto.
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

  // Disparar push notification en paralelo (no bloquea si falla)
  try {
    await enviarPushAUsuario(userId, {
      title: titulo,
      body: mensaje ?? '',
      url: URLS_POR_TIPO[tipo] ?? '/',
      tag: tipo,
    })
  } catch (e) {
    console.error('enviarPush error:', e)
  }
}
