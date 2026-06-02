'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { crearNotificacion } from '@/lib/notificaciones'

/**
 * El alumno envía un mensaje a su profesor.
 * Se determina quién es el profe buscando el created_by de la rutina
 * activa del alumno; si no tiene rutina, se busca cualquier usuario con
 * role='profe' (caso multi-profe será futuro).
 */
export async function enviarMensajeAProfe(
  mensaje: string
): Promise<{ error?: string }> {
  const texto = mensaje.trim()
  if (!texto) return { error: 'El mensaje no puede estar vacío.' }
  if (texto.length > 1000) return { error: 'El mensaje es demasiado largo (máx 1000 caracteres).' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Validar que el usuario es alumno
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nombre, apellido')
    .eq('id', user.id)
    .single() as { data: { role: string; nombre: string; apellido: string | null } | null }

  if (!profile || profile.role !== 'alumno') {
    return { error: 'Sin permisos.' }
  }

  const nombreAlumno = `${profile.nombre} ${profile.apellido ?? ''}`.trim()

  // Determinar el profe: el creador de la rutina activa del alumno
  const admin = createAdminClient()
  let profeId: string | null = null

  const { data: rutinaActiva } = await admin
    .from('rutinas')
    .select('created_by')
    .eq('alumno_id', user.id)
    .eq('activa', true)
    .maybeSingle() as { data: { created_by: string } | null }

  if (rutinaActiva?.created_by) {
    profeId = rutinaActiva.created_by
  } else {
    // Fallback: cualquier profe (caso típico de gimnasio con 1 profe)
    const { data: profe } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'profe')
      .limit(1)
      .maybeSingle() as { data: { id: string } | null }
    profeId = profe?.id ?? null
  }

  if (!profeId) return { error: 'No se encontró un profe para enviar el mensaje.' }

  await crearNotificacion(
    profeId,
    'mensaje_alumno',
    `Mensaje de ${nombreAlumno}`,
    texto
  )

  return {}
}
