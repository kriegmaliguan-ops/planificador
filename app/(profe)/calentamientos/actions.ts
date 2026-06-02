'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'

async function verifyProfe(): Promise<{ ok: boolean; userId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { ok: false }
  return { ok: true, userId: user.id }
}

export async function crearCalentamiento(data: {
  nombre: string
  descripcion: string | null
  duracion_minutos: number | null
  video_url: string | null
}): Promise<{ error?: string; id?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }
  if (!data.nombre.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { data: row, error } = typed<{ id: string }>(
    await (supabase.from('calentamientos') as any)
      .insert({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        duracion_minutos: data.duracion_minutos,
        video_url: data.video_url?.trim() || null,
        created_by: auth.userId,
      })
      .select('id')
      .single()
  )
  if (error || !row) return { error: 'Error al guardar.' }

  revalidatePath('/calentamientos')
  return { id: row.id }
}

export async function actualizarCalentamiento(
  id: string,
  data: {
    nombre: string
    descripcion: string | null
    duracion_minutos: number | null
    video_url: string | null
  }
): Promise<{ error?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }
  if (!data.nombre.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { error } = await (supabase.from('calentamientos') as any)
    .update({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      duracion_minutos: data.duracion_minutos,
      video_url: data.video_url?.trim() || null,
    })
    .eq('id', id)
  if (error) return { error: 'Error al actualizar.' }

  revalidatePath('/calentamientos')
  return {}
}

export async function eliminarCalentamiento(id: string): Promise<{ error?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }

  const supabase = await createClient()
  const { error } = await supabase.from('calentamientos').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar.' }

  revalidatePath('/calentamientos')
  return {}
}

// Asignar/desasignar calentamiento a un día de rutina
export async function asignarCalentamientoADia(args: {
  diaId: string
  calentamientoId: string | null
  alumnoId: string
}): Promise<{ error?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }

  const supabase = await createClient()
  const { error } = await (supabase.from('rutina_dias') as any)
    .update({ calentamiento_id: args.calentamientoId })
    .eq('id', args.diaId)
  if (error) return { error: 'Error al asignar el calentamiento.' }

  revalidatePath(`/rutinas/${args.alumnoId}`)
  return {}
}
