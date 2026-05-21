import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { HistorialCliente } from '@/components/alumno/HistorialCliente'
import type { Profile, GrupoMuscular } from '@/lib/types/database'

// ── Tipos exportados (los consume HistorialCliente) ───────────────────────

export interface RegistroItem {
  id: string
  fecha: string
  seriesCompletadas: number | null
  repeticionesRealizadas: string | null
  pesoUtilizado: number | null
  rpe: number | null
  notas: string | null
  ejercicioId: string
  ejercicioNombre: string
  grupos: GrupoMuscular[]
  pesoObjetivo: number | null
  seriesObjetivo: number
  repsObjetivo: string
}

export interface SesionDia {
  fecha: string
  registros: RegistroItem[]
}

export interface ProgresionEjercicio {
  ejercicioId: string
  ejercicioNombre: string
  grupos: GrupoMuscular[]
  historial: Array<{
    fecha: string
    peso: number | null
    reps: string | null
    series: number | null
    rpe: number | null
  }>
}

// ── Fetch ─────────────────────────────────────────────────────────────────

async function getHistorial(alumnoId: string) {
  const supabase = await createClient()

  const { data: rawRegistros } = await supabase
    .from('registros_progreso')
    .select(`
      id, fecha, series_completadas, repeticiones_realizadas,
      peso_utilizado, rpe, notas, created_at,
      rutina_ejercicio:rutina_ejercicios(
        id, series, repeticiones, peso_objetivo,
        ejercicio:ejercicios(
          id, nombre,
          grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))
        )
      )
    `)
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: true }) as { data: any[] | null }

  const registros = rawRegistros ?? []

  // Normalizar a RegistroItem
  const items: RegistroItem[] = registros.map((r: any) => ({
    id: r.id,
    fecha: r.fecha,
    seriesCompletadas: r.series_completadas,
    repeticionesRealizadas: r.repeticiones_realizadas,
    pesoUtilizado: r.peso_utilizado,
    rpe: r.rpe,
    notas: r.notas,
    ejercicioId: r.rutina_ejercicio?.ejercicio?.id ?? '',
    ejercicioNombre: r.rutina_ejercicio?.ejercicio?.nombre ?? 'Ejercicio',
    grupos: (r.rutina_ejercicio?.ejercicio?.grupos ?? []).map(
      (g: any) => g.grupo as GrupoMuscular
    ),
    pesoObjetivo: r.rutina_ejercicio?.peso_objetivo ?? null,
    seriesObjetivo: r.rutina_ejercicio?.series ?? 0,
    repsObjetivo: r.rutina_ejercicio?.repeticiones ?? '',
  }))

  // Agrupar por fecha (ya ordenadas desc desde Supabase)
  const sesionesMap = new Map<string, RegistroItem[]>()
  for (const item of items) {
    if (!sesionesMap.has(item.fecha)) sesionesMap.set(item.fecha, [])
    sesionesMap.get(item.fecha)!.push(item)
  }
  const sesiones: SesionDia[] = Array.from(sesionesMap.entries()).map(
    ([fecha, regs]) => ({ fecha, registros: regs })
  )

  // Progresión por ejercicio (ordenada asc para el gráfico)
  const itemsAsc = [...items].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const progresionMap = new Map<string, ProgresionEjercicio>()
  for (const item of itemsAsc) {
    if (!item.ejercicioId) continue
    if (!progresionMap.has(item.ejercicioId)) {
      progresionMap.set(item.ejercicioId, {
        ejercicioId: item.ejercicioId,
        ejercicioNombre: item.ejercicioNombre,
        grupos: item.grupos,
        historial: [],
      })
    }
    progresionMap.get(item.ejercicioId)!.historial.push({
      fecha: item.fecha,
      peso: item.pesoUtilizado,
      reps: item.repeticionesRealizadas,
      series: item.seriesCompletadas,
      rpe: item.rpe,
    })
  }
  const progresion = Array.from(progresionMap.values())

  return { sesiones, progresion, total: items.length }
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function HistorialPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('id').eq('id', user.id).single()
  )
  if (!profile) redirect('/login')

  const { sesiones, progresion, total } = await getHistorial(profile.id)

  return (
    <HistorialCliente sesiones={sesiones} progresion={progresion} total={total} />
  )
}
