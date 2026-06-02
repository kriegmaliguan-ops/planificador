'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface DatosPersonales {
  nombre: string
  apellido: string
  peso: number | null
  altura: number | null
  fecha_nacimiento: string | null
  objetivo: string | null
  instagram?: string | null
  whatsapp?: string | null
}

function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  const sinUrl = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')
  return sinUrl.replace(/^@/, '')
}

function normalizeWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  return v.replace(/[^\d]/g, '') || null
}

export async function actualizarDatosAlumno(
  datos: DatosPersonales
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { error } = await (supabase.from('profiles') as any).update({
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim() || null,
    peso: datos.peso,
    altura: datos.altura,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    objetivo: datos.objetivo?.trim() || null,
    instagram: normalizeInstagram(datos.instagram),
    whatsapp: normalizeWhatsapp(datos.whatsapp),
  }).eq('id', user.id)

  if (error) return { error: 'No se pudieron guardar los datos.' }

  revalidatePath('/perfil')
  return {}
}

export async function marcarPasswordCambiado(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase.from('profiles') as any)
    .update({ password_changed: true })
    .eq('id', user.id)

  revalidatePath('/perfil')
  revalidatePath('/rutina')
}
