'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'

export async function crearEjercicio(
  formData: FormData
): Promise<{ error?: string; success?: boolean; id?: string }> {
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
  return { success: true, id: ej.id }
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

  // Verificar que sea profe
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // 1. Obtener todos los rutina_ejercicio ids que usan este ejercicio
  const { data: rutinaEjs } = await (admin.from('rutina_ejercicios') as any)
    .select('id')
    .eq('ejercicio_id', id) as { data: { id: string }[] | null }

  const reIds = (rutinaEjs ?? []).map((r) => r.id)

  // 2. Borrar registros de progreso vinculados
  if (reIds.length > 0) {
    await (admin.from('registros_progreso') as any)
      .delete()
      .in('rutina_ejercicio_id', reIds)
  }

  // 3. Borrar rutina_ejercicios
  await (admin.from('rutina_ejercicios') as any).delete().eq('ejercicio_id', id)

  // 4. Borrar relaciones de grupo muscular
  await (admin.from('ejercicio_grupos') as any).delete().eq('ejercicio_id', id)

  // 5. Borrar el ejercicio
  const { error } = await admin.from('ejercicios').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar el ejercicio.' }

  revalidatePath('/ejercicios')
  return { success: true }
}
