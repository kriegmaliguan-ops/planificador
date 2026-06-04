'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { typed } from '@/lib/supabase/types-helper'
import type { DiaSemana } from '@/lib/types/database'

async function verifyProfe(): Promise<{ ok: boolean; userId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { ok: false }
  return { ok: true, userId: user.id }
}

// ── Crear bloque desde un día de rutina existente ────────────────────────────

export async function guardarDiaComoBloque(args: {
  diaId: string
  nombre: string
  descripcion?: string | null
}): Promise<{ error?: string; id?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }
  if (!args.nombre.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const admin = createAdminClient()

  // Cargar ejercicios del día
  const { data: ejercicios } = await supabase
    .from('rutina_ejercicios')
    .select('ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo, modalidad, agrupacion')
    .eq('dia_id', args.diaId)
    .order('orden') as { data: any[] | null }

  if (!ejercicios || ejercicios.length === 0) {
    return { error: 'El día no tiene ejercicios para guardar como bloque.' }
  }

  // Crear bloque
  const { data: bloque, error: errBloque } = typed<{ id: string }>(
    await (admin.from('bloques_dia') as any)
      .insert({
        nombre: args.nombre.trim(),
        descripcion: args.descripcion?.trim() || null,
        created_by: auth.userId,
      })
      .select('id')
      .single()
  )

  if (errBloque || !bloque) return { error: 'Error al crear el bloque.' }

  // Insertar ejercicios
  const payload = ejercicios.map((e) => ({
    bloque_id: bloque.id,
    ejercicio_id: e.ejercicio_id,
    orden: e.orden ?? 0,
    series: e.series ?? 3,
    repeticiones: e.repeticiones ?? '10',
    peso_objetivo: e.peso_objetivo ?? null,
    descanso_segundos: e.descanso_segundos ?? 90,
    duracion_segundos: e.duracion_segundos ?? null,
    notas: e.notas ?? null,
    rpe_objetivo: e.rpe_objetivo ?? null,
    modalidad: e.modalidad ?? 'normal',
    agrupacion: e.agrupacion ?? null,
  }))

  const { error: errEj } = await (admin.from('bloque_ejercicios') as any).insert(payload)
  if (errEj) {
    await admin.from('bloques_dia').delete().eq('id', bloque.id)
    return { error: 'Error al guardar los ejercicios del bloque.' }
  }

  revalidatePath('/bloques')
  return { id: bloque.id }
}

// ── Renombrar bloque ──────────────────────────────────────────────────────────

export async function renombrarBloque(
  id: string,
  nombre: string,
  descripcion: string | null
): Promise<{ error?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }
  if (!nombre.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { error } = await (supabase.from('bloques_dia') as any)
    .update({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
    .eq('id', id)
  if (error) return { error: 'Error al renombrar.' }

  revalidatePath('/bloques')
  return {}
}

// ── Eliminar bloque ───────────────────────────────────────────────────────────

export async function eliminarBloque(id: string): Promise<{ error?: string }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }

  const supabase = await createClient()
  const { error } = await supabase.from('bloques_dia').delete().eq('id', id)
  if (error) return { error: 'Error al eliminar.' }

  revalidatePath('/bloques')
  return {}
}

// ── Aplicar bloque a un día de rutina ────────────────────────────────────────

export async function aplicarBloqueADia(args: {
  bloqueId: string
  rutinaId: string
  diaSemana: DiaSemana
  semanaNumero: number
  alumnoId: string
  modo: 'append' | 'replace'
}): Promise<{ error?: string; ejerciciosAgregados?: number }> {
  const auth = await verifyProfe()
  if (!auth.ok) return { error: 'Sin permisos.' }

  const supabase = await createClient()
  const admin = createAdminClient()

  // 1) Cargar ejercicios del bloque
  const { data: bloqueEjs } = await supabase
    .from('bloque_ejercicios')
    .select('ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo, modalidad, agrupacion')
    .eq('bloque_id', args.bloqueId)
    .order('orden') as { data: any[] | null }

  if (!bloqueEjs || bloqueEjs.length === 0) {
    return { error: 'El bloque no tiene ejercicios.' }
  }

  // 2) Buscar o crear el día destino
  const { data: diaExistente } = await supabase
    .from('rutina_dias')
    .select('id')
    .eq('rutina_id', args.rutinaId)
    .eq('dia_semana', args.diaSemana)
    .eq('semana_numero', args.semanaNumero)
    .maybeSingle() as { data: { id: string } | null }

  let diaId: string
  if (diaExistente) {
    diaId = diaExistente.id
    if (args.modo === 'replace') {
      await admin.from('rutina_ejercicios').delete().eq('dia_id', diaId)
    }
  } else {
    const { data: nuevoDia, error: errDia } = typed<{ id: string }>(
      await (admin.from('rutina_dias') as any)
        .insert({
          rutina_id: args.rutinaId,
          dia_semana: args.diaSemana,
          semana_numero: args.semanaNumero,
          orden: 0,
        })
        .select('id')
        .single()
    )
    if (errDia || !nuevoDia) return { error: 'Error al crear el día.' }
    diaId = nuevoDia.id
  }

  // 3) Determinar el orden de inicio (append vs replace)
  let ordenInicio = 0
  if (args.modo === 'append') {
    const { data: ultimo } = await supabase
      .from('rutina_ejercicios')
      .select('orden')
      .eq('dia_id', diaId)
      .order('orden', { ascending: false })
      .limit(1) as { data: { orden: number }[] | null }
    ordenInicio = (ultimo?.[0]?.orden ?? -1) + 1
  }

  // 4) Insertar ejercicios del bloque en el día
  const payload = bloqueEjs.map((e, i) => ({
    dia_id: diaId,
    ejercicio_id: e.ejercicio_id,
    orden: ordenInicio + i,
    series: e.series ?? 3,
    repeticiones: e.repeticiones ?? '10',
    peso_objetivo: e.peso_objetivo ?? null,
    descanso_segundos: e.descanso_segundos ?? 90,
    duracion_segundos: e.duracion_segundos ?? null,
    notas: e.notas ?? null,
    rpe_objetivo: e.rpe_objetivo ?? null,
    modalidad: e.modalidad ?? 'normal',
    agrupacion: e.agrupacion ?? null,
  }))

  const { error } = await (admin.from('rutina_ejercicios') as any).insert(payload)
  if (error) return { error: 'Error al aplicar el bloque.' }

  revalidatePath(`/rutinas/${args.alumnoId}`)
  return { ejerciciosAgregados: payload.length }
}
