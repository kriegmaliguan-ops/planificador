'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { typed } from '@/lib/supabase/types-helper'
import { crearNotificacion } from '@/lib/notificaciones'

// ── Crear plantilla vacía ─────────────────────────────────────────────────────

export async function crearPlantilla(
  nombre: string
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Validar profe
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  const { data, error } = typed<{ id: string }>(
    await (supabase.from('rutinas') as any)
      .insert({
        alumno_id: null,
        is_template: true,
        nombre,
        activa: false,
        created_by: user.id,
      })
      .select('id')
      .single()
  )

  if (error || !data) return { error: 'Error al crear la plantilla.' }

  revalidatePath('/plantillas')
  return { id: data.id }
}

// ── Eliminar plantilla ────────────────────────────────────────────────────────

export async function eliminarPlantilla(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Usar admin para que cascade delete todo (rutina_dias, rutina_ejercicios)
  const admin = createAdminClient()
  const { error } = await admin
    .from('rutinas')
    .delete()
    .eq('id', id)
    .eq('is_template', true)
    .eq('created_by', user.id)

  if (error) return { error: 'Error al eliminar la plantilla.' }

  revalidatePath('/plantillas')
  return {}
}

// ── Clonar plantilla → rutina para un alumno ──────────────────────────────────

export async function crearRutinaDesdePlantilla(args: {
  plantillaId: string
  alumnoId: string
  nombre: string  // nombre de la nueva rutina del alumno
  fechaInicio?: string | null
  mensajeProfe?: string | null
}): Promise<{ error?: string; id?: string }> {
  const { plantillaId, alumnoId, nombre, fechaInicio, mensajeProfe } = args

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const admin = createAdminClient()

  // 1) Cargar plantilla con días y ejercicios
  const { data: plantilla } = await (admin.from('rutinas') as any)
    .select(`
      id, is_template,
      dias:rutina_dias(
        id, dia_semana, semana_numero, nombre, es_descanso, orden, calentamiento_id,
        ejercicios:rutina_ejercicios(
          ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo
        )
      )
    `)
    .eq('id', plantillaId)
    .eq('is_template', true)
    .single() as { data: any | null }

  if (!plantilla) return { error: 'Plantilla no encontrada.' }

  // 2) Desactivar rutinas previas del alumno
  await (admin.from('rutinas') as any)
    .update({ activa: false })
    .eq('alumno_id', alumnoId)

  // 3) Crear la rutina nueva
  const { data: nuevaRutina, error: errRut } = typed<{ id: string }>(
    await (admin.from('rutinas') as any)
      .insert({
        alumno_id: alumnoId,
        is_template: false,
        nombre,
        activa: true,
        fecha_inicio: fechaInicio ?? null,
        created_by: user.id,
      })
      .select('id')
      .single()
  )

  if (errRut || !nuevaRutina) return { error: 'Error al crear la rutina.' }

  const rutinaId = nuevaRutina.id

  // 4) Clonar días
  const dias = (plantilla.dias ?? []) as any[]
  if (dias.length > 0) {
    // Insertar días en bulk
    const diasPayload = dias.map((d) => ({
      rutina_id: rutinaId,
      dia_semana: d.dia_semana,
      semana_numero: d.semana_numero ?? 1,
      nombre: d.nombre ?? null,
      es_descanso: d.es_descanso ?? false,
      orden: d.orden ?? 0,
      calentamiento_id: d.calentamiento_id ?? null,
    }))
    const { data: nuevosDias, error: errDias } = await (admin.from('rutina_dias') as any)
      .insert(diasPayload)
      .select('id, dia_semana, semana_numero') as { data: { id: string; dia_semana: string; semana_numero: number }[] | null; error: any }

    if (errDias || !nuevosDias) {
      await admin.from('rutinas').delete().eq('id', rutinaId)  // rollback
      return { error: 'Error al copiar los días.' }
    }

    // Mapa para correlacionar día viejo → día nuevo
    const mapaDias = new Map<string, string>()
    for (const dViejo of dias) {
      const key = `${dViejo.dia_semana}__${dViejo.semana_numero ?? 1}`
      const dNuevo = nuevosDias.find((nd) => `${nd.dia_semana}__${nd.semana_numero}` === key)
      if (dNuevo) mapaDias.set(dViejo.id, dNuevo.id)
    }

    // 5) Clonar ejercicios
    const ejPayload: any[] = []
    for (const dViejo of dias) {
      const diaNuevoId = mapaDias.get(dViejo.id)
      if (!diaNuevoId) continue
      for (const ej of (dViejo.ejercicios ?? []) as any[]) {
        ejPayload.push({
          dia_id: diaNuevoId,
          ejercicio_id: ej.ejercicio_id,
          orden: ej.orden ?? 0,
          series: ej.series ?? 3,
          repeticiones: ej.repeticiones ?? '10',
          peso_objetivo: ej.peso_objetivo ?? null,
          descanso_segundos: ej.descanso_segundos ?? 90,
          duracion_segundos: ej.duracion_segundos ?? null,
          notas: ej.notas ?? null,
          rpe_objetivo: ej.rpe_objetivo ?? null,
        })
      }
    }

    if (ejPayload.length > 0) {
      const { error: errEj } = await (admin.from('rutina_ejercicios') as any).insert(ejPayload)
      if (errEj) {
        await admin.from('rutinas').delete().eq('id', rutinaId)  // rollback
        return { error: 'Error al copiar los ejercicios.' }
      }
    }
  }

  // 6) Notificar al alumno
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
  revalidatePath(`/alumnos/${alumnoId}`)
  return { id: rutinaId }
}
