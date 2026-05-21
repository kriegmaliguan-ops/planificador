'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'

export async function crearEjercicio(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const descripcion = (formData.get('descripcion') as string)?.trim() || null
  const video_url = (formData.get('video_url') as string)?.trim() || null
  const grupoIds = formData.getAll('grupos') as string[]

  if (!nombre) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: ej, error } = typed<{ id: string }>(
    await supabase
      .from('ejercicios')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ nombre, descripcion, video_url, created_by: user.id } as any)
      .select('id')
      .single()
  )

  if (error || !ej) return { error: 'Error al crear el ejercicio.' }

  if (grupoIds.length > 0) {
    await (supabase.from('ejercicio_grupos') as any).insert(
      grupoIds.map((grupo_id) => ({ ejercicio_id: ej.id, grupo_id }))
    )
  }

  revalidatePath('/ejercicios')
  return { success: true }
}

export async function editarEjercicio(
  id: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const descripcion = (formData.get('descripcion') as string)?.trim() || null
  const video_url = (formData.get('video_url') as string)?.trim() || null
  const grupoIds = formData.getAll('grupos') as string[]

  if (!nombre) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from('ejercicios').update({ nombre, descripcion, video_url } as any).eq('id', id)

  // Reemplazar grupos: borrar todos y reinsertar
  await (supabase.from('ejercicio_grupos') as any).delete().eq('ejercicio_id', id)
  if (grupoIds.length > 0) {
    await (supabase.from('ejercicio_grupos') as any).insert(
      grupoIds.map((grupo_id) => ({ ejercicio_id: id, grupo_id }))
    )
  }

  revalidatePath('/ejercicios')
  return { success: true }
}

export async function eliminarEjercicio(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('ejercicios').delete().eq('id', id)
  if (error) return { error: 'No se puede eliminar: el ejercicio está en uso en alguna rutina.' }
  revalidatePath('/ejercicios')
  return { success: true }
}
