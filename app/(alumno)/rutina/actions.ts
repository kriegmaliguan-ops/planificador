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
  tiempo_real_segundos?: number | null
  fc_promedio?: number | null
  distancia_metros?: number | null
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const hoy = data.fecha ?? getHoyChile()

  // Verificar si ya hay un registro hoy para este ejercicio (limit 1 para sobrevivir duplicados existentes)
  const { data: existentes } = await supabase
    .from('registros_progreso')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('rutina_ejercicio_id', data.rutinaEjercicioId)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
    .limit(1) as { data: { id: string }[] | null }
  const existente = existentes?.[0] ?? null

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
  if (data.tiempo_real_segundos !== undefined) payload.tiempo_real_segundos = data.tiempo_real_segundos
  if (data.fc_promedio !== undefined) payload.fc_promedio = data.fc_promedio
  if (data.distancia_metros !== undefined) payload.distancia_metros = data.distancia_metros

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

// ── Eliminar registro de progreso ────────────────────────────────────────────

export async function eliminarProgreso(
  rutinaEjercicioId: string,
  fecha: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { error } = await supabase
    .from('registros_progreso')
    .delete()
    .eq('alumno_id', user.id)
    .eq('rutina_ejercicio_id', rutinaEjercicioId)
    .eq('fecha', fecha)

  if (error) return { error: 'Error al eliminar el registro.' }

  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return {}
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

  const { data: existentes_b } = await supabase
    .from('registros_bienestar')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
    .limit(1) as { data: { id: string }[] | null }
  const existente = existentes_b?.[0] ?? null

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

// ── Registrar peso corporal ───────────────────────────────────────────────────

export async function registrarPeso(data: {
  pesoKg: number
  notas: string | null
  fecha?: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const hoy = data.fecha ?? getHoyChile()

  const { data: existentes_p } = await supabase
    .from('registros_peso')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
    .limit(1) as { data: { id: string }[] | null }
  const existente = existentes_p?.[0] ?? null

  if (existente) {
    const { error } = await (supabase.from('registros_peso') as any)
      .update({ peso_kg: data.pesoKg, notas: data.notas })
      .eq('id', existente.id)
    if (error) return { error: 'Error al actualizar el peso.' }
  } else {
    const { error } = await (supabase.from('registros_peso') as any)
      .insert({ alumno_id: user.id, fecha: hoy, peso_kg: data.pesoKg, notas: data.notas })
    if (error) return { error: 'Error al guardar el peso.' }
  }

  revalidatePath('/progreso')
  return { success: true }
}

// ── Eliminar registro de historial por ID ────────────────────────────────────

export async function eliminarRegistroProgreso(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { error } = await supabase
    .from('registros_progreso')
    .delete()
    .eq('id', id)
    .eq('alumno_id', user.id)
  if (error) return { error: 'Error al eliminar.' }
  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return {}
}

// ── Actualizar registro de historial por ID ──────────────────────────────────

export async function actualizarRegistroProgreso(
  id: string,
  data: {
    series_completadas: number
    repeticiones_realizadas: string
    peso_utilizado: number | null
    rpe: number | null
    notas: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { error } = await (supabase.from('registros_progreso') as any)
    .update(data)
    .eq('id', id)
    .eq('alumno_id', user.id)
  if (error) return { error: 'Error al actualizar.' }
  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return {}
}

// ── Eliminar registro de bienestar por ID ────────────────────────────────────

export async function eliminarRegistroBienestar(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  await supabase.from('registros_bienestar').delete().eq('id', id).eq('alumno_id', user.id)
  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return {}
}

// ── Registrar todos los ejercicios sin registro del día ──────────────────────

export async function registrarTodoDia(data: {
  ejercicios: Array<{
    rutinaEjercicioId: string
    series: number
    repeticiones: string
  }>
  fecha: string
}): Promise<{ error?: string; registrados?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Obtener los que ya tienen registro en esa fecha
  const reIds = data.ejercicios.map((e) => e.rutinaEjercicioId)
  const { data: existentes } = await supabase
    .from('registros_progreso')
    .select('rutina_ejercicio_id')
    .eq('alumno_id', user.id)
    .eq('fecha', data.fecha)
    .in('rutina_ejercicio_id', reIds) as { data: { rutina_ejercicio_id: string }[] | null }

  const yaRegistrados = new Set((existentes ?? []).map((r) => r.rutina_ejercicio_id))

  const pendientes = data.ejercicios.filter((e) => !yaRegistrados.has(e.rutinaEjercicioId))
  if (pendientes.length === 0) return { registrados: 0 }

  const inserts = pendientes.map((e) => ({
    alumno_id: user.id,
    rutina_ejercicio_id: e.rutinaEjercicioId,
    fecha: data.fecha,
    series_completadas: e.series,
    repeticiones_realizadas: e.repeticiones,
    peso_utilizado: null,
    rpe: null,
    notas: null,
  }))

  const { error } = await (supabase.from('registros_progreso') as any).insert(inserts)
  if (error) return { error: 'Error al registrar ejercicios.' }

  revalidatePath('/rutina', 'page')
  revalidatePath('/progreso')
  return { registrados: pendientes.length }
}

// ── Registrar medidas corporales ─────────────────────────────────────────────

export async function registrarMedidas(data: {
  cintura_cm: number | null
  pecho_cm: number | null
  brazo_cm: number | null
  muslo_cm: number | null
  pantorrilla_cm: number | null
  cadera_cm: number | null
  cuello_cm: number | null
  notas: string | null
  fecha?: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Al menos un campo debe tener valor
  const algunoNoNull = [
    data.cintura_cm, data.pecho_cm, data.brazo_cm, data.muslo_cm,
    data.pantorrilla_cm, data.cadera_cm, data.cuello_cm
  ].some((v) => v !== null && !Number.isNaN(v))
  if (!algunoNoNull) return { error: 'Cargá al menos una medida.' }

  const hoy = data.fecha ?? getHoyChile()

  // UPSERT: si ya hay un registro para esta fecha, actualizarlo
  const { data: existentes } = await supabase
    .from('medidas_corporales')
    .select('id')
    .eq('alumno_id', user.id)
    .eq('fecha', hoy)
    .limit(1) as { data: { id: string }[] | null }
  const existente = existentes?.[0] ?? null

  const payload = {
    cintura_cm: data.cintura_cm,
    pecho_cm: data.pecho_cm,
    brazo_cm: data.brazo_cm,
    muslo_cm: data.muslo_cm,
    pantorrilla_cm: data.pantorrilla_cm,
    cadera_cm: data.cadera_cm,
    cuello_cm: data.cuello_cm,
    notas: data.notas,
  }

  if (existente) {
    const { error } = await (supabase.from('medidas_corporales') as any)
      .update(payload)
      .eq('id', existente.id)
    if (error) return { error: 'Error al actualizar las medidas.' }
  } else {
    const { error } = await (supabase.from('medidas_corporales') as any)
      .insert({ alumno_id: user.id, fecha: hoy, ...payload })
    if (error) return { error: 'Error al guardar las medidas.' }
  }

  revalidatePath('/progreso')
  return { success: true }
}

// ── Eliminar medida corporal por ID ──────────────────────────────────────────

export async function eliminarMedida(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { error } = await supabase
    .from('medidas_corporales')
    .delete()
    .eq('id', id)
    .eq('alumno_id', user.id)
  if (error) return { error: 'Error al eliminar.' }
  revalidatePath('/progreso')
  return {}
}
