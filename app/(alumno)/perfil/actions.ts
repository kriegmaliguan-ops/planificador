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
