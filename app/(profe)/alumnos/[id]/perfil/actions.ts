'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function normalizeInstagram(raw: string | null): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  // Quitar @ inicial si está, y URL completa si pegaron una
  const sinUrl = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')
  return sinUrl.replace(/^@/, '')
}

function normalizeWhatsapp(raw: string | null): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  // Mantener solo dígitos (sin + ni espacios ni guiones)
  return v.replace(/[^\d]/g, '') || null
}

export async function actualizarPerfilAlumno(
  alumnoId: string,
  data: {
    nombre: string
    apellido: string | null
    peso: number | null
    altura: number | null
    fecha_nacimiento: string | null
    objetivo: string | null
    notas_profe: string | null
    instagram: string | null
    whatsapp: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  const { error } = await (supabase.from('profiles') as any)
    .update({
      nombre: data.nombre.trim(),
      apellido: data.apellido?.trim() || null,
      peso: data.peso,
      altura: data.altura,
      fecha_nacimiento: data.fecha_nacimiento || null,
      objetivo: data.objetivo?.trim() || null,
      notas_profe: data.notas_profe?.trim() || null,
      instagram: normalizeInstagram(data.instagram),
      whatsapp: normalizeWhatsapp(data.whatsapp),
    })
    .eq('id', alumnoId)

  if (error) return { error: 'Error al guardar los datos.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  revalidatePath(`/alumnos/${alumnoId}/perfil`)
  return {}
}
