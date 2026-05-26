import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { getHoyChile } from '@/lib/utils'
import { ProgresoCliente } from '@/components/alumno/ProgresoCliente'
import type { Profile, GrupoMuscular } from '@/lib/types/database'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PuntoTemporal {
  label: string
  fecha: string
  rpe: number | null
  descanso: number | null
  sesiones: number
  esHoy: boolean
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

export interface RpeEjercicio {
  nombre: string
  rpe: number
}

// ── Helpers de agregación ─────────────────────────────────────────────────────

function avgOrNull(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Lunes de la semana que contiene `hoy` */
function getLunes(hoy: string): string {
  const [y, m, d] = hoy.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay() // 0=dom
  return addDays(hoy, jsDay === 0 ? -6 : -(jsDay - 1))
}

/** Diario: últimos 7 días, hoy resaltado */
function buildDiario(
  hoy: string,
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(hoy, -(6 - i))
    const date = new Date(key + 'T12:00:00')
    const label = date.toLocaleDateString('es-AR', { weekday: 'short' })
      .replace('.', '').substring(0, 2).toUpperCase()
    const b = bienestar.find((x) => x.fecha === key)
    const rpeDay = rpe.filter((x) => x.fecha === key).map((x) => x.rpe)
    return { label, fecha: key, rpe: avgOrNull(rpeDay), descanso: b?.descanso ?? null, sesiones: rpeDay.length, esHoy: key === hoy }
  })
}

/** Semanal: lunes a domingo de la semana actual, días de descanso naturalmente vacíos */
function buildSemanal(
  hoy: string,
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const lunes = getLunes(hoy)
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(lunes, i)
    const b = bienestar.find((x) => x.fecha === key)
    const rpeDay = rpe.filter((x) => x.fecha === key).map((x) => x.rpe)
    return { label: LABELS[i], fecha: key, rpe: avgOrNull(rpeDay), descanso: b?.descanso ?? null, sesiones: rpeDay.length, esHoy: key === hoy }
  })
}

/** Mensual: 4 semanas del mes actual (S1=días 1-7, S2=8-14, S3=15-21, S4=22-fin) */
function buildMensual(
  hoy: string,
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const [y, m] = hoy.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return Array.from({ length: 4 }, (_, i) => {
    const startDay = i * 7 + 1
    const endDay = i === 3 ? lastDay : Math.min((i + 1) * 7, lastDay)
    const dates: string[] = []
    for (let d = startDay; d <= endDay; d++) {
      dates.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    const rpeW = rpe.filter((x) => dates.includes(x.fecha)).map((x) => x.rpe)
    const bW = bienestar.filter((x) => dates.includes(x.fecha)).map((x) => x.descanso)
    return {
      label: `S${i + 1}`,
      fecha: dates[0],
      rpe: avgOrNull(rpeW),
      descanso: avgOrNull(bW),
      sesiones: new Set(rpe.filter((x) => dates.includes(x.fecha)).map((x) => x.fecha)).size,
      esHoy: dates.includes(hoy),
    }
  })
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function getDatos(alumnoId: string, hoy: string) {
  const supabase = await createClient()
  const desdeStr = addDays(hoy, -180)

  // Step 1: fetch all data in parallel (sin FK joins en progreso para evitar alias issue)
  const [bienestarResult, progresoResult, pesoResult] = await Promise.allSettled([
    supabase
      .from('registros_bienestar')
      .select('fecha, descanso, notas')
      .eq('alumno_id', alumnoId)
      .gte('fecha', desdeStr)
      .order('fecha', { ascending: false }) as unknown as Promise<{ data: any[] | null }>,
    supabase
      .from('registros_progreso')
      .select('id, fecha, rpe, series_completadas, repeticiones_realizadas, peso_utilizado, notas, rutina_ejercicio_id')
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

  const bienestar = (bienestarResult.status === 'fulfilled' ? (bienestarResult.value.data ?? []) : []) as RegistroBienestar[]
  const progresoRaw = (progresoResult.status === 'fulfilled' ? (progresoResult.value.data ?? []) : []) as any[]
  const pesos = (pesoResult.status === 'fulfilled' ? (pesoResult.value.data ?? []) : []) as RegistroPeso[]

  // Step 2: resolver nombres de ejercicios con queries directas (2 pasos)
  const reIds = [...new Set(progresoRaw.map((r) => r.rutina_ejercicio_id).filter(Boolean))] as string[]
  const ejIdByReId = new Map<string, string>()
  const ejDataMap = new Map<string, { nombre: string; grupos: GrupoMuscular[] }>()

  if (reIds.length > 0) {
    const { data: rutinaEjs } = await supabase
      .from('rutina_ejercicios')
      .select('id, ejercicio_id')
      .in('id', reIds)
    for (const re of rutinaEjs ?? []) ejIdByReId.set(re.id, re.ejercicio_id)

    const ejIds = [...new Set([...ejIdByReId.values()])] as string[]
    if (ejIds.length > 0) {
      const { data: ejs } = await supabase
        .from('ejercicios')
        .select('id, nombre, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
        .in('id', ejIds)
      for (const ej of ejs ?? []) {
        ejDataMap.set(ej.id, {
          nombre: (ej as any).nombre ?? 'Ejercicio',
          grupos: (((ej as any).grupos ?? []) as any[]).map((g: any) => g.grupo as GrupoMuscular).filter(Boolean),
        })
      }
    }
  }

  function getEjData(reId: string): { nombre: string; grupos: GrupoMuscular[] } {
    const ejId = ejIdByReId.get(reId)
    if (!ejId) return { nombre: 'Ejercicio', grupos: [] }
    return ejDataMap.get(ejId) ?? { nombre: 'Ejercicio', grupos: [] }
  }

  // RPE records para los gráficos de barras (semanal/mensual)
  const rpeRecords = progresoRaw.filter((r) => r.rpe !== null).map((r) => ({
    fecha: r.fecha,
    rpe: r.rpe as number,
  }))

  // rpeHoy: RPE por ejercicio del día actual
  const rpeHoy: RpeEjercicio[] = progresoRaw
    .filter((r) => r.fecha === hoy && r.rpe !== null)
    .map((r) => ({ nombre: getEjData(r.rutina_ejercicio_id).nombre, rpe: r.rpe as number }))

  // Estadísticas
  const estadisticas: DatosEstadisticas = {
    diario: buildDiario(hoy, bienestar, rpeRecords),
    semanal: buildSemanal(hoy, bienestar, rpeRecords),
    mensual: buildMensual(hoy, bienestar, rpeRecords),
  }

  // Historial (agrupado por fecha)
  const sesionesMap = new Map<string, RegistroHistorial[]>()
  for (const r of progresoRaw) {
    if (!sesionesMap.has(r.fecha)) sesionesMap.set(r.fecha, [])
    const ejData = getEjData(r.rutina_ejercicio_id)
    sesionesMap.get(r.fecha)!.push({
      id: r.id,
      fecha: r.fecha,
      ejercicioNombre: ejData.nombre,
      grupos: ejData.grupos,
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

  return { estadisticas, historial, bienestar, pesos, rpeHoy, totalRegistros: progresoRaw.length }
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
  const { estadisticas, historial, bienestar, pesos, rpeHoy, totalRegistros } = await getDatos(profile.id, hoy)

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
      rpeHoy={rpeHoy}
      totalRegistros={totalRegistros}
    />
  )
}
