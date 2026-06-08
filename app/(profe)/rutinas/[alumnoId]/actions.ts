'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { typed } from '@/lib/supabase/types-helper'
import { crearNotificacion } from '@/lib/notificaciones'
import type { DiaSemana } from '@/lib/types/database'

// ── Crear rutina ──────────────────────────────────────────────────────────────

export async function crearRutina(
  alumnoId: string,
  nombre: string,
  fechaInicio?: string | null,
  mensajeProfe?: string | null
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  await (supabase.from('rutinas') as any)
    .update({ activa: false })
    .eq('alumno_id', alumnoId)

  const { data, error } = typed<{ id: string }>(
    await (supabase.from('rutinas') as any)
      .insert({ alumno_id: alumnoId, nombre, activa: true, created_by: user.id, fecha_inicio: fechaInicio ?? null })
      .select('id')
      .single()
  )

  if (error || !data) return { error: 'Error al crear la rutina.' }

  // Notificar al alumno (con mensaje personalizado del profe si lo dejó)
  const cuerpo = mensajeProfe && mensajeProfe.trim()
    ? mensajeProfe.trim()
    : `"${nombre}" ya está disponible en tu app.`

  await crearNotificacion(
    alumnoId,
    'rutina_nueva',
    '¡Tu profe te asignó una nueva rutina!',
    cuerpo
  )

  revalidatePath(`/rutinas/${alumnoId}`)
  return { id: data.id }
}

// ── Enviar mensaje al alumno (independiente de crear rutina) ─────────────────

export async function enviarMensajeAlumno(
  alumnoId: string,
  mensaje: string
): Promise<{ error?: string }> {
  const texto = mensaje.trim()
  if (!texto) return { error: 'El mensaje no puede estar vacío.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Validar que el caller sea profe
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  await crearNotificacion(
    alumnoId,
    'mensaje_profe',
    'Mensaje de tu profe',
    texto
  )

  return {}
}

// ── Actualizar fecha de inicio de rutina ─────────────────────────────────────

export async function actualizarFechaInicio(
  rutinaId: string,
  fechaInicio: string | null,
  alumnoId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('rutinas') as any)
    .update({ fecha_inicio: fechaInicio })
    .eq('id', rutinaId)
    .eq('created_by', user.id)
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Actualizar nombre de rutina ───────────────────────────────────────────────

export async function actualizarNombreRutina(
  id: string,
  nombre: string,
  alumnoId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('rutinas') as any).update({ nombre }).eq('id', id).eq('created_by', user.id)
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Agregar ejercicio a un día ────────────────────────────────────────────────

export async function agregarEjercicioARutina({
  rutinaId,
  diaId,
  diaSemana,
  semanaNumero,
  alumnoId,
  ejercicioId,
  series,
  repeticiones,
  peso_objetivo,
  descanso_segundos,
  duracion_segundos,
  modalidad,
  agrupacion,
  tipo_cardio,
  duracion_total_segundos,
  trabajo_segundos,
  descanso_intervalo_segundos,
  rondas,
  fc_objetivo_min,
  fc_objetivo_max,
  intensidad,
  metros_objetivo,
}: {
  rutinaId: string
  diaId: string | null
  diaSemana: DiaSemana
  semanaNumero: number
  alumnoId: string
  ejercicioId: string
  series: number
  repeticiones: string
  peso_objetivo: number | null
  descanso_segundos: number
  duracion_segundos?: number | null
  modalidad?: string
  agrupacion?: string | null
  tipo_cardio?: 'liss' | 'hiit' | 'tabata' | 'tempo' | null
  duracion_total_segundos?: number | null
  trabajo_segundos?: number | null
  descanso_intervalo_segundos?: number | null
  rondas?: number | null
  fc_objetivo_min?: number | null
  fc_objetivo_max?: number | null
  intensidad?: string | null
  metros_objetivo?: number | null
}): Promise<{ error?: string; diaId?: string; ejercicioRutinaId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  let finalDiaId = diaId

  if (!finalDiaId) {
    const { data: dia, error: diaError } = typed<{ id: string }>(
      await (supabase.from('rutina_dias') as any)
        .insert({ rutina_id: rutinaId, dia_semana: diaSemana, orden: 0, semana_numero: semanaNumero })
        .select('id')
        .single()
    )
    if (diaError || !dia) return { error: 'Error al crear el día.' }
    finalDiaId = dia.id
  }

  const { data: existing } = await supabase
    .from('rutina_ejercicios')
    .select('orden')
    .eq('dia_id', finalDiaId)
    .order('orden', { ascending: false })
    .limit(1) as { data: { orden: number }[] | null }

  const orden = (existing?.[0]?.orden ?? -1) + 1

  const { data: re, error } = typed<{ id: string }>(
    await (supabase.from('rutina_ejercicios') as any)
      .insert({
        dia_id: finalDiaId,
        ejercicio_id: ejercicioId,
        orden,
        series,
        repeticiones,
        peso_objetivo,
        descanso_segundos,
        duracion_segundos: duracion_segundos ?? null,
        modalidad: modalidad ?? 'normal',
        agrupacion: agrupacion ?? null,
        tipo_cardio: tipo_cardio ?? null,
        duracion_total_segundos: duracion_total_segundos ?? null,
        trabajo_segundos: trabajo_segundos ?? null,
        descanso_intervalo_segundos: descanso_intervalo_segundos ?? null,
        rondas: rondas ?? null,
        fc_objetivo_min: fc_objetivo_min ?? null,
        fc_objetivo_max: fc_objetivo_max ?? null,
        intensidad: intensidad ?? null,
        metros_objetivo: metros_objetivo ?? null,
      })
      .select('id')
      .single()
  )

  if (error || !re) return { error: 'Error al agregar el ejercicio.' }

  revalidatePath(`/rutinas/${alumnoId}`)
  return { diaId: finalDiaId, ejercicioRutinaId: re.id }
}

// ── Reordenar ejercicios de un día ────────────────────────────────────────────

export async function reordenarEjercicios(
  ejercicioIds: string[],
  alumnoId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await Promise.all(
    ejercicioIds.map((id, i) =>
      (supabase.from('rutina_ejercicios') as any).update({ orden: i }).eq('id', id)
    )
  )
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Actualizar parámetros de un ejercicio en la rutina ────────────────────────

export async function actualizarEjercicioRutina(
  id: string,
  alumnoId: string,
  params: Partial<{
    series: number
    repeticiones: string
    peso_objetivo: number | null
    descanso_segundos: number | null
    duracion_segundos: number | null
    notas: string | null
    rpe_objetivo: number | null
    modalidad: string
    agrupacion: string | null
    tipo_cardio: 'liss' | 'hiit' | 'tabata' | 'tempo' | null
    duracion_total_segundos: number | null
    trabajo_segundos: number | null
    descanso_intervalo_segundos: number | null
    rondas: number | null
    fc_objetivo_min: number | null
    fc_objetivo_max: number | null
    intensidad: string | null
    metros_objetivo: number | null
  }>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('rutina_ejercicios') as any).update(params).eq('id', id)
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Eliminar ejercicio de un día ──────────────────────────────────────────────

export async function removerEjercicioDeRutina(
  id: string,
  alumnoId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('rutina_ejercicios').delete().eq('id', id)
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Actualizar nombre de un día ───────────────────────────────────────────────

export async function actualizarNombreDia(
  diaId: string,
  nombre: string,
  alumnoId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('rutina_dias') as any).update({ nombre }).eq('id', diaId)
  revalidatePath(`/rutinas/${alumnoId}`)
}

// ── Marcar / desmarcar día de descanso ────────────────────────────────────────

export async function toggleDiaDescanso(
  rutinaId: string,
  diaSemana: DiaSemana,
  semanaNumero: number,
  diaId: string | null,
  esDescanso: boolean,
  alumnoId: string
): Promise<{ error?: string; diaId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  let finalDiaId = diaId

  if (!finalDiaId) {
    const { data, error } = typed<{ id: string }>(
      await (supabase.from('rutina_dias') as any)
        .insert({ rutina_id: rutinaId, dia_semana: diaSemana, orden: 0, semana_numero: semanaNumero, es_descanso: esDescanso })
        .select('id')
        .single()
    )
    if (error || !data) return { error: 'Error al crear el día.' }
    finalDiaId = data.id
  } else {
    await (supabase.from('rutina_dias') as any)
      .update({ es_descanso: esDescanso })
      .eq('id', finalDiaId)
  }

  revalidatePath(`/rutinas/${alumnoId}`)
  return { diaId: finalDiaId }
}

// ── Copiar ejercicios de un día a otro ───────────────────────────────────────

export async function copiarDia(
  rutinaId: string,
  diaOrigenId: string,
  diaDestinoSemana: DiaSemana,
  semanaNumero: number,
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Cargar el día origen (incluyendo calentamiento)
  const { data: origen } = await supabase
    .from('rutina_dias')
    .select('id, calentamiento_id, ejercicios:rutina_ejercicios(ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo, modalidad, agrupacion)')
    .eq('id', diaOrigenId)
    .maybeSingle() as { data: any | null }

  const ejercicios = (origen?.ejercicios ?? []) as any[]
  if (!ejercicios.length) return { error: 'El día origen no tiene ejercicios.' }

  const { data: diaDestino } = await supabase
    .from('rutina_dias')
    .select('id')
    .eq('rutina_id', rutinaId)
    .eq('dia_semana', diaDestinoSemana)
    .eq('semana_numero', semanaNumero)
    .maybeSingle() as { data: { id: string } | null }

  let destinoId: string
  if (diaDestino) {
    destinoId = diaDestino.id
    await supabase.from('rutina_ejercicios').delete().eq('dia_id', destinoId)
    // Actualizar también el calentamiento del destino
    await (supabase.from('rutina_dias') as any)
      .update({ calentamiento_id: origen?.calentamiento_id ?? null })
      .eq('id', destinoId)
  } else {
    const { data: nuevoDia, error } = typed<{ id: string }>(
      await (supabase.from('rutina_dias') as any)
        .insert({
          rutina_id: rutinaId,
          dia_semana: diaDestinoSemana,
          orden: 0,
          semana_numero: semanaNumero,
          calentamiento_id: origen?.calentamiento_id ?? null,
        })
        .select('id')
        .single()
    )
    if (error || !nuevoDia) return { error: 'Error al crear el día destino.' }
    destinoId = nuevoDia.id
  }

  const nuevos = ejercicios.map((e) => ({ ...e, dia_id: destinoId }))
  const { error } = await (supabase.from('rutina_ejercicios') as any).insert(nuevos)
  if (error) return { error: 'Error al copiar los ejercicios.' }

  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

// ── Eliminar semana completa ──────────────────────────────────────────────────

export async function eliminarSemana(
  rutinaId: string,
  semanaNumero: number,
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Obtener todos los días de la semana
  const { data: dias } = await supabase
    .from('rutina_dias')
    .select('id')
    .eq('rutina_id', rutinaId)
    .eq('semana_numero', semanaNumero) as { data: { id: string }[] | null }

  if (dias?.length) {
    const diaIds = dias.map((d) => d.id)
    // Eliminar ejercicios primero
    await supabase.from('rutina_ejercicios').delete().in('dia_id', diaIds)
    // Eliminar días
    await supabase.from('rutina_dias').delete().in('id', diaIds)
  }

  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

// ── Copiar semana completa ────────────────────────────────────────────────────

export async function copiarSemana(
  rutinaId: string,
  semanaOrigen: number,
  semanaDestino: number,
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Obtener todos los días de la semana origen con sus ejercicios
  const { data: diasOrigen } = await supabase
    .from('rutina_dias')
    .select('id, dia_semana, nombre, es_descanso, orden, calentamiento_id, rutina_ejercicios(ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo, modalidad, agrupacion)')
    .eq('rutina_id', rutinaId)
    .eq('semana_numero', semanaOrigen) as { data: any[] | null }

  if (!diasOrigen?.length) return { error: 'La semana origen no tiene días.' }

  for (const diaOrigen of diasOrigen) {
    // Eliminar día destino si existe
    const { data: diaExistente } = await supabase
      .from('rutina_dias')
      .select('id')
      .eq('rutina_id', rutinaId)
      .eq('dia_semana', diaOrigen.dia_semana)
      .eq('semana_numero', semanaDestino)
      .maybeSingle() as { data: { id: string } | null }

    let destinoId: string

    if (diaExistente) {
      destinoId = diaExistente.id
      await supabase.from('rutina_ejercicios').delete().eq('dia_id', destinoId)
      await (supabase.from('rutina_dias') as any)
        .update({
          nombre: diaOrigen.nombre,
          es_descanso: diaOrigen.es_descanso,
          calentamiento_id: diaOrigen.calentamiento_id ?? null,
        })
        .eq('id', destinoId)
    } else {
      const { data: nuevoDia, error: diaErr } = typed<{ id: string }>(
        await (supabase.from('rutina_dias') as any)
          .insert({
            rutina_id: rutinaId,
            dia_semana: diaOrigen.dia_semana,
            nombre: diaOrigen.nombre,
            es_descanso: diaOrigen.es_descanso,
            orden: diaOrigen.orden,
            semana_numero: semanaDestino,
            calentamiento_id: diaOrigen.calentamiento_id ?? null,
          })
          .select('id')
          .single()
      )
      if (diaErr || !nuevoDia) return { error: 'Error al crear día destino.' }
      destinoId = nuevoDia.id
    }

    // Copiar ejercicios si no es descanso
    const ejercicios = diaOrigen.rutina_ejercicios ?? []
    if (ejercicios.length > 0) {
      const nuevos = ejercicios.map((e: any) => ({ ...e, dia_id: destinoId }))
      const { error: ejErr } = await (supabase.from('rutina_ejercicios') as any).insert(nuevos)
      if (ejErr) return { error: 'Error al copiar ejercicios.' }
    }
  }

  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

// ── Agrupar ejercicios en biserie/superserie/triserie ────────────────────────

export async function agruparEjercicios(args: {
  ejercicioIds: string[]      // 2 o 3 IDs de rutina_ejercicios
  modalidad: 'biserie' | 'superserie' | 'triserie'
  alumnoId: string
}): Promise<{ error?: string; agrupacion?: string }> {
  if (args.ejercicioIds.length < 2 || args.ejercicioIds.length > 3) {
    return { error: 'Tenés que elegir 2 o 3 ejercicios.' }
  }
  if (args.modalidad === 'triserie' && args.ejercicioIds.length !== 3) {
    return { error: 'La triserie requiere exactamente 3 ejercicios.' }
  }
  if ((args.modalidad === 'biserie' || args.modalidad === 'superserie') && args.ejercicioIds.length !== 2) {
    return { error: 'Biserie/superserie requieren exactamente 2 ejercicios.' }
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Cargar info de los ejercicios elegidos (necesitamos dia_id + orden)
  const { data: rows } = await admin
    .from('rutina_ejercicios')
    .select('id, dia_id, orden')
    .in('id', args.ejercicioIds) as { data: { id: string; dia_id: string; orden: number }[] | null }

  if (!rows || rows.length !== args.ejercicioIds.length) {
    return { error: 'No se encontraron todos los ejercicios.' }
  }

  // Validar que estén en el mismo día
  const diaId = rows[0].dia_id
  if (!rows.every((r) => r.dia_id === diaId)) {
    return { error: 'Todos los ejercicios deben ser del mismo día.' }
  }

  // Generar próxima letra de agrupación libre en el día (A, B, C...)
  const { data: existing } = await admin
    .from('rutina_ejercicios')
    .select('agrupacion')
    .eq('dia_id', diaId)
    .not('agrupacion', 'is', null) as { data: { agrupacion: string }[] | null }
  const usadas = new Set((existing ?? []).map((e) => (e.agrupacion ?? '').toUpperCase()))
  let letra = ''
  for (let i = 0; i < 26; i++) {
    const candidato = String.fromCharCode(65 + i)  // A, B, C...
    if (!usadas.has(candidato)) { letra = candidato; break }
  }
  if (!letra) return { error: 'Demasiados grupos en este día.' }

  // Reordenar: ponerlos consecutivos preservando el menor orden inicial
  const ordenInicio = Math.min(...rows.map((r) => r.orden))

  // Para reordenar: queremos que los seleccionados queden en orden ordenInicio, ordenInicio+1, ...
  // y el resto de los ejercicios del día se reacomoden.
  const { data: todosDelDia } = await admin
    .from('rutina_ejercicios')
    .select('id, orden')
    .eq('dia_id', diaId)
    .order('orden') as { data: { id: string; orden: number }[] | null }

  const seleccionadoIds = new Set(args.ejercicioIds)
  const seleccionadosOrdenados = (todosDelDia ?? [])
    .filter((e) => seleccionadoIds.has(e.id))
    .sort((a, b) => a.orden - b.orden)
    .map((e) => e.id)
  // Aplicar el orden dado por el caller (args.ejercicioIds) o por orden actual: usamos el caller order
  const finalSeleccionados = args.ejercicioIds.filter((id) => seleccionadosOrdenados.includes(id))

  const noSeleccionados = (todosDelDia ?? [])
    .filter((e) => !seleccionadoIds.has(e.id))
    .map((e) => e.id)

  // Nuevo orden:
  // - Antes de ordenInicio: los no seleccionados que ya estaban antes
  // - Desde ordenInicio: los seleccionados consecutivos
  // - Después: los no seleccionados que estaban después
  const nuevoOrden: string[] = []
  let cursor = 0
  for (const id of (todosDelDia ?? []).map((e) => e.id)) {
    if (cursor === ordenInicio) {
      // Insertar los seleccionados acá
      for (const sid of finalSeleccionados) nuevoOrden.push(sid)
      cursor += finalSeleccionados.length
    }
    if (!seleccionadoIds.has(id)) {
      nuevoOrden.push(id)
      cursor++
    }
  }
  // Edge case: si ordenInicio era mayor que todos, agregar al final
  if (!finalSeleccionados.every((id) => nuevoOrden.includes(id))) {
    for (const sid of finalSeleccionados) {
      if (!nuevoOrden.includes(sid)) nuevoOrden.push(sid)
    }
  }

  // Update orden + modalidad/agrupacion en una transacción de updates
  // (no hay transacciones nativas en supabase JS, hacemos updates secuenciales)
  for (let i = 0; i < nuevoOrden.length; i++) {
    const id = nuevoOrden[i]
    const isSelected = seleccionadoIds.has(id)
    const update: any = { orden: i }
    if (isSelected) {
      update.modalidad = args.modalidad
      update.agrupacion = letra
    }
    await (admin.from('rutina_ejercicios') as any).update(update).eq('id', id)
  }

  revalidatePath(`/rutinas/${args.alumnoId}`)
  return { agrupacion: letra }
}

// ── Desagrupar (quitar modalidad/agrupacion a ejercicios) ────────────────────

export async function desagruparEjercicios(
  agrupacion: string,
  diaId: string,
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  await (admin.from('rutina_ejercicios') as any)
    .update({ modalidad: 'normal', agrupacion: null })
    .eq('dia_id', diaId)
    .eq('agrupacion', agrupacion)

  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

// ── Activar una rutina (desactiva las otras del mismo alumno) ─────────────────

export async function activarRutina(
  rutinaId: string,
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Verificar que sea profe
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  // Desactivar todas las del alumno
  await (supabase.from('rutinas') as any)
    .update({ activa: false })
    .eq('alumno_id', alumnoId)

  // Activar la elegida
  const { error } = await (supabase.from('rutinas') as any)
    .update({ activa: true })
    .eq('id', rutinaId)
    .eq('alumno_id', alumnoId)

  if (error) return { error: 'Error al activar la rutina.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

// ── Eliminar rutina completa ──────────────────────────────────────────────────
// confirmarConRegistros: si la rutina tiene registros_progreso del alumno,
// avisa al frontend para que el profe lo confirme explícitamente.

export async function eliminarRutina(
  rutinaId: string,
  alumnoId: string,
  confirmarConRegistros = false
): Promise<{ error?: string; tieneRegistros?: number }> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Verificar que sea profe
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  // Chequear si tiene registros asociados (vía rutina_dias → rutina_ejercicios → registros_progreso)
  if (!confirmarConRegistros) {
    const { data: dias } = await admin
      .from('rutina_dias').select('id').eq('rutina_id', rutinaId) as { data: { id: string }[] | null }
    const diaIds = (dias ?? []).map((d) => d.id)
    if (diaIds.length > 0) {
      const { data: ejs } = await admin
        .from('rutina_ejercicios').select('id').in('dia_id', diaIds) as { data: { id: string }[] | null }
      const ejIds = (ejs ?? []).map((e) => e.id)
      if (ejIds.length > 0) {
        const { count } = await admin
          .from('registros_progreso')
          .select('id', { count: 'exact', head: true })
          .in('rutina_ejercicio_id', ejIds) as { count: number | null }
        if (count && count > 0) {
          return { tieneRegistros: count }
        }
      }
    }
  }

  // Usar admin para asegurar el cascade delete (cascade borra rutina_dias →
  // rutina_ejercicios → registros_progreso si confirmarConRegistros=true)
  const { error } = await admin
    .from('rutinas')
    .delete()
    .eq('id', rutinaId)
    .eq('alumno_id', alumnoId)
    .eq('is_template', false)

  if (error) return { error: 'Error al eliminar la rutina.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  return {}
}
