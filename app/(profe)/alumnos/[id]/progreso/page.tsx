import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHoyChile } from '@/lib/utils'
import { ProgresoCliente } from '@/components/alumno/ProgresoCliente'
import type { GrupoMuscular } from '@/lib/types/database'
import type {
  DatosEstadisticas,
  SesionHistorial,
  RegistroHistorial,
  PuntoTemporal,
  RegistroPeso,
} from '@/app/(alumno)/progreso/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function avgOrNull(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getLunes(hoy: string): string {
  const [y, m, d] = hoy.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  return addDays(hoy, jsDay === 0 ? -6 : -(jsDay - 1))
}

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

function buildMensual(
  hoy: string,
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const lunes = getLunes(hoy)
  return Array.from({ length: 8 }, (_, i) => {
    const weekStart = addDays(lunes, -7 * (7 - i))
    const dates = Array.from({ length: 7 }, (_, j) => addDays(weekStart, j))
    const rpeW = rpe.filter((x) => dates.includes(x.fecha)).map((x) => x.rpe)
    const bW = bienestar.filter((x) => dates.includes(x.fecha)).map((x) => x.descanso)
    const [, wm, wd] = weekStart.split('-').map(Number)
    return {
      label: `${wd}/${wm}`,
      fecha: weekStart,
      rpe: avgOrNull(rpeW),
      descanso: avgOrNull(bW),
      sesiones: new Set(rpe.filter((x) => dates.includes(x.fecha)).map((x) => x.fecha)).size,
      esHoy: dates.includes(hoy),
    }
  })
}

async function getDatos(alumnoId: string, hoy: string) {
  const supabase = await createClient()
  const desdeStr = addDays(hoy, -180)

  const [bienestarResult, progresoResult, pesoResult] = await Promise.all([
    supabase
      .from('registros_bienestar')
      .select('fecha, descanso, notas')
      .eq('alumno_id', alumnoId)
      .gte('fecha', desdeStr)
      .order('fecha', { ascending: true }) as unknown as Promise<{ data: any[] | null }>,
    supabase
      .from('registros_progreso')
      .select(`
        id, fecha, rpe, series_completadas, repeticiones_realizadas, peso_utilizado, notas,
        rutina_ejercicio:rutina_ejercicios(
          ejercicio:ejercicios(id, nombre, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre)))
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

  const bienestar = (bienestarResult.data ?? []) as { fecha: string; descanso: number; notas: string | null }[]
  const progreso = (progresoResult.data ?? []) as any[]
  const pesos = (pesoResult.data ?? []) as RegistroPeso[]
  const rpeRecords = progreso.filter((r) => r.rpe !== null).map((r) => ({ fecha: r.fecha, rpe: r.rpe as number }))

  const estadisticas: DatosEstadisticas = {
    diario: buildDiario(hoy, bienestar, rpeRecords),
    semanal: buildSemanal(hoy, bienestar, rpeRecords),
    mensual: buildMensual(hoy, bienestar, rpeRecords),
  }

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
  const historial: SesionHistorial[] = Array.from(sesionesMap.entries()).map(([fecha, registros]) => ({ fecha, registros }))

  return { estadisticas, historial, pesos, totalRegistros: progreso.length }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProgresoAlumnoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: alumno } = await supabase
    .from('profiles')
    .select('id, nombre, apellido')
    .eq('id', id)
    .eq('role', 'alumno')
    .single() as { data: { id: string; nombre: string; apellido: string | null } | null }

  if (!alumno) notFound()

  const hoy = getHoyChile()
  const { estadisticas, historial, pesos, totalRegistros } = await getDatos(id, hoy)

  return (
    <div className="px-4 py-6 md:p-8 max-w-4xl">
      <Link
        href={`/alumnos/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {alumno.nombre} {alumno.apellido ?? ''}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Progreso de {alumno.nombre}
      </h1>

      {/* pesoHoy omitido → vista solo lectura (sin card de registro) */}
      <ProgresoCliente
        estadisticas={estadisticas}
        historial={historial}
        pesos={pesos}
        totalRegistros={totalRegistros}
      />
    </div>
  )
}
