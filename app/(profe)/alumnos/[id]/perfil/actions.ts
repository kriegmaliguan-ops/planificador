'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await (supabase.from('profiles') as any)
    .update({
      nombre: data.nombre.trim(),
      apellido: data.apellido?.trim() || null,
      peso: data.peso,
      altura: data.altura,
      fecha_nacimiento: data.fecha_nacimiento || null,
      objetivo: data.objetivo?.trim() || null,
      notas_profe: data.notas_profe?.trim() || null,
    })
    .eq('id', alumnoId)

  if (error) return { error: 'Error al guardar los datos.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  revalidatePath(`/alumnos/${alumnoId}/perfil`)
  return {}
}
