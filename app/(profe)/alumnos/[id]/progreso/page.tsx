import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgresoCliente } from '@/components/alumno/ProgresoCliente'
import type { GrupoMuscular } from '@/lib/types/database'
import type {
  DatosEstadisticas,
  SesionHistorial,
  RegistroHistorial,
  PuntoTemporal,
} from '@/app/(alumno)/progreso/page'

// ── Helpers (duplicados del alumno/progreso para el lado profe) ───────────────

function avgOrNull(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function buildDiario(
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const hoy = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
    const b = bienestar.find((x) => x.fecha === key)
    const rpeDay = rpe.filter((x) => x.fecha === key).map((x) => x.rpe)
    return { label, descanso: b?.descanso ?? null, rpe: avgOrNull(rpeDay), sesiones: rpeDay.length > 0 ? 1 : 0 }
  })
}

function buildSemanal(
  bienestar: { fecha: string; descanso: number }[],
  rpe: { fecha: string; rpe: number }[]
): PuntoTemporal[] {
  const hoy = new Date()
  const semanas: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i * 7)
    semanas.push(getISOWeekKey(d.toISOString().split('T')[0]))
  }
  const unique = [...new Set(semanas)].slice(-8)
  return unique.map((wk, i) => {
    const b = bienestar.filter((x) => getISOWeekKey(x.fecha) === wk).map((x) => x.descanso)
    const r = rpe.filter((x) => getISOWeekKey(x.fecha) === wk).map((x) => x.rpe)
    return {
      label: `Sem ${i + 1}`,
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
  const hoy = new Date()
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

async function getDatos(alumnoId: string) {
  const supabase = await createClient()
  const desde = new Date()
  desde.setDate(desde.getDate() - 180)
  const desdeStr = desde.toISOString().split('T')[0]

  const [bienestarResult, progresoResult] = await Promise.all([
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
  ])

  const bienestar = (bienestarResult.data ?? []) as { fecha: string; descanso: number; notas: string | null }[]
  const progreso = (progresoResult.data ?? []) as any[]
  const rpeRecords = progreso.filter((r) => r.rpe !== null).map((r) => ({ fecha: r.fecha, rpe: r.rpe as number }))

  const estadisticas: DatosEstadisticas = {
    diario: buildDiario(bienestar, rpeRecords),
    semanal: buildSemanal(bienestar, rpeRecords),
    mensual: buildMensual(bienestar, rpeRecords),
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

  return { estadisticas, historial, totalRegistros: progreso.length }
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

  const { estadisticas, historial, totalRegistros } = await getDatos(id)

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

      <ProgresoCliente
        estadisticas={estadisticas}
        historial={historial}
        totalRegistros={totalRegistros}
      />
    </div>
  )
}
