'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function enviarNotificacion(
  alumnoId: string,
  titulo: string,
  mensaje: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verificar que el caller es profe
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  const { error } = await (supabase.from('notificaciones' as any)).insert({
    user_id: alumnoId,
    tipo: 'mensaje',
    titulo: titulo.trim(),
    mensaje: mensaje.trim() || null,
    leida: false,
  })

  if (error) return { error: 'Error al enviar la notificación.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  return {}
}
