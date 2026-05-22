import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { getHoyChile } from '@/lib/utils'
import { ProgresoCliente } from '@/components/alumno/ProgresoCliente'
import type { Profile, GrupoMuscular } from '@/lib/types/database'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PuntoTemporal {
  label: string
  descanso: number | null
  rpe: number | null
  sesiones: number
}

export interface DatosEstadisticas {
  diario: PuntoTemporal[]
  semanal: PuntoTemporal[]
  mensual: PuntoTemporal[]
}

export interface RegistroHistorial {
  id: string
  fecha: string
  ejercicioNombre: string
  grupos: GrupoMuscular[]
  series: number | null
  reps: string | null
  peso: number | null
  rpe: number | null
  notas: string | null
}

export interface SesionHistorial {
  fecha: string
  registros: RegistroHistorial[]
}

export interface RegistroBienestar {
  fecha: string
  descanso: number
  notas: string | null
}

export interface RegistroPeso {
  fecha: string
  peso_kg: number
  notas: string | null
}

// ── Helpers de agregación ─────────────────────────────────────────────────────

function avgOrNull(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function getHoyDate(): Date {
  // Fecha de hoy en Chile, parseada como Date local
  const hoy = getHoyChile()
  const [y, m, d] = hoy.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function buildDiario(
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const hoy = getHoyDate()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (13 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
    const b = bienestar.find((x) => x.fecha === key)
    const rpeDay = rpe.filter((x) => x.fecha === key).map((x) => x.rpe)
    return {
      label,
      descanso: b?.descanso ?? null,
      rpe: avgOrNull(rpeDay),
      sesiones: rpeDay.length > 0 ? 1 : 0,
    }
  })
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function weekKeyToMonday(wk: string): Date {
  const [yearStr, weekStr] = wk.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  return monday
}

function buildSemanal(
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const hoy = getHoyDate()
  const hoyStr = getHoyChile()
  const currentWeek = getISOWeekKey(hoyStr)
  const semanas: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i * 7)
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    semanas.push(getISOWeekKey(str))
  }
  const unique = [...new Set(semanas)].slice(-8)

  return unique.map((wk) => {
    const b = bienestar.filter((x) => getISOWeekKey(x.fecha) === wk).map((x) => x.descanso)
    const r = rpe.filter((x) => getISOWeekKey(x.fecha) === wk).map((x) => x.rpe)
    const monday = weekKeyToMonday(wk)
    const label = wk === currentWeek
      ? 'Hoy'
      : monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    return {
      label,
      descanso: avgOrNull(b),
      rpe: avgOrNull(r),
      sesiones: new Set(rpe.filter((x) => getISOWeekKey(x.fecha) === wk).map((x) => x.fecha)).size,
    }
  })
}

function buildMensual(
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const hoy = getHoyDate()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'short' })
    const b = bienestar.filter((x) => x.fecha.startsWith(key)).map((x) => x.descanso)
    const r = rpe.filter((x) => x.fecha.startsWith(key)).map((x) => x.rpe)
    return {
      label,
      descanso: avgOrNull(b),
      rpe: avgOrNull(r),
      sesiones: new Set(rpe.filter((x) => x.fecha.startsWith(key)).map((x) => x.fecha)).size,
    }
  })
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function getDatos(alumnoId: string) {
  const supabase = await createClient()
  const desde = getHoyDate()
  desde.setDate(desde.getDate() - 180)
  const desdeStr = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-${String(desde.getDate()).padStart(2, '0')}`

  const [bienestarResult, progresoResult, pesoResult] = await Promise.all([
    supabase
      .from('registros_bienestar')
      .select('fecha, descanso, notas')
      .eq('alumno_id', alumnoId)
      .gte('fecha', desdeStr)
      .order('fecha', { ascending: false }) as unknown as Promise<{ data: any[] | null }>,
    supabase
      .from('registros_progreso')
      .select(`
        id, fecha, rpe, series_completadas, repeticiones_realizadas, peso_utilizado, notas,
        rutina_ejercicio:rutina_ejercicios(
          ejercicio:ejercicios(
            id, nombre,
            grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))
          )
        )
      `)
      .eq('alumno_id', alumnoId)
      .gte('fecha', desdeStr)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: any[] | null }>,
    supabase
      .from('registros_peso')
      .select('fecha, peso_kg, notas')
      .eq('alumno_id', alumnoId)
      .gte('fecha', desdeStr)
      .order('fecha', { ascending: false }) as unknown as Promise<{ data: any[] | null }>,
  ])

  const bienestar = (bienestarResult.data ?? []) as RegistroBienestar[]
  const progreso = (progresoResult.data ?? []) as any[]
  const pesos = (pesoResult.data ?? []) as RegistroPeso[]

  // RPE records (solo los que tienen rpe)
  const rpeRecords = progreso.filter((r) => r.rpe !== null).map((r) => ({
    fecha: r.fecha,
    rpe: r.rpe as number,
  }))

  // Estadísticas
  const estadisticas: DatosEstadisticas = {
    diario: buildDiario(bienestar, rpeRecords),
    semanal: buildSemanal(bienestar, rpeRecords),
    mensual: buildMensual(bienestar, rpeRecords),
  }

  // Historial (agrupado por fecha)
  const sesionesMap = new Map<string, RegistroHistorial[]>()
  for (const r of progreso) {
    if (!sesionesMap.has(r.fecha)) sesionesMap.set(r.fecha, [])
    sesionesMap.get(r.fecha)!.push({
      id: r.id,
      fecha: r.fecha,
      ejercicioNombre: r.rutina_ejercicio?.ejercicio?.nombre ?? 'Ejercicio',
      grupos: (r.rutina_ejercicio?.ejercicio?.grupos ?? []).map((g: any) => g.grupo as GrupoMuscular),
      series: r.series_completadas,
      reps: r.repeticiones_realizadas,
      peso: r.peso_utilizado,
      rpe: r.rpe,
      notas: r.notas,
    })
  }
  const historial: SesionHistorial[] = Array.from(sesionesMap.entries()).map(([fecha, registros]) => ({
    fecha,
    registros,
  }))

  return { estadisticas, historial, bienestar, pesos, totalRegistros: progreso.length }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('id').eq('id', user.id).single()
  )
  if (!profile) redirect('/login')

  const hoy = getHoyChile()
  const { estadisticas, historial, bienestar, pesos, totalRegistros } = await getDatos(profile.id)

  // Peso de hoy (null = no registrado aún, undefined = no se muestra el card)
  const pesoHoyRaw = pesos.find((p) => p.fecha === hoy)
  const pesoHoy = pesoHoyRaw
    ? { peso_kg: pesoHoyRaw.peso_kg, notas: pesoHoyRaw.notas }
    : null

  return (
    <ProgresoCliente
      estadisticas={estadisticas}
      historial={historial}
      bienestar={bienestar}
      pesos={pesos}
      pesoHoy={pesoHoy}
      totalRegistros={totalRegistros}
    />
  )
}
