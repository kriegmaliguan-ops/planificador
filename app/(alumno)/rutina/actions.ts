'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHoyChile } from '@/lib/utils'

export async function registrarProgreso(data: {
  rutinaEjercicioId: string
  seriesCompletadas: number
  repeticionesRealizadas: string
  pesoUtilizado: number | null
  pesos_por_serie?: (number | null)[]
  rpe: number | null
  notas: string | null
  fecha?: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const hoy = data.fecha ?? getHoyChile()

  // Verificar si ya hay un registro hoy para este ejercicio
  const { data: existente } = await supabase
    .from('registros_progreso')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('rutina_ejercicio_id', data.rutinaEjercicioId)
    .eq('fecha', hoy)
    .maybeSingle() as { data: { id: string } | null }

  const payload: Record<string, unknown> = {
    series_completadas: data.seriesCompletadas,
    repeticiones_realizadas: data.repeticionesRealizadas,
    peso_utilizado: data.pesoUtilizado,
    rpe: data.rpe,
    notas: data.notas,
  }
  if (data.pesos_por_serie && data.pesos_por_serie.length > 0) {
    payload.pesos_por_serie = data.pesos_por_serie
  }

  if (existente) {
    const { error } = await (supabase.from('registros_progreso') as any)
      .update(payload)
      .eq('id', existente.id)
    if (error) return { error: 'Error al actualizar el registro.' }
  } else {
    const { error } = await (supabase.from('registros_progreso') as any)
      .insert({ alumno_id: user.id, rutina_ejercicio_id: data.rutinaEjercicioId, fecha: hoy, ...payload })
    if (error) return { error: 'Error al guardar el registro.' }
  }

  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return { success: true }
}

// ── Registrar bienestar/sueño ─────────────────────────────────────────────────

export async function registrarBienestar(data: {
  descanso: number
  notas: string | null
  fecha?: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const hoy = data.fecha ?? getHoyChile()

  const { data: existente } = await supabase
    .from('registros_bienestar')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('fecha', hoy)
    .maybeSingle() as { data: { id: string } | null }

  if (existente) {
    const { error } = await (supabase.from('registros_bienestar') as any)
      .update({ descanso: data.descanso, notas: data.notas })
      .eq('id', existente.id)
    if (error) return { error: 'Error al actualizar.' }
  } else {
    const { error } = await (supabase.from('registros_bienestar') as any)
      .insert({ alumno_id: user.id, fecha: hoy, descanso: data.descanso, notas: data.notas })
    if (error) return { error: 'Error al guardar.' }
  }

  revalidatePath('/rutina')
  revalidatePath('/progreso')
  return { success: true }
}
