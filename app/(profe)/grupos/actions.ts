'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function crearGrupo(
  nombre: string
): Promise<{ error?: string; id?: string }> {
  if (!nombre.trim()) return { error: 'El nombre es obligatorio.' }
  const supabase = await createClient()
  const { data, error } = await (supabase.from('grupos_musculares') as any)
    .insert({ nombre: nombre.trim() })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un grupo con ese nombre.' }
    return { error: 'Error al crear el grupo.' }
  }
  revalidatePath('/grupos')
  revalidatePath('/ejercicios')
  return { id: data.id }
}

export async function eliminarGrupo(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('grupos_musculares').delete().eq('id', id)
  if (error) return { error: 'No se puede eliminar (puede estar en uso).' }
  revalidatePath('/grupos')
  revalidatePath('/ejercicios')
  return {}
}
