import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { RutinaBuilder } from '@/components/rutinas/RutinaBuilder'
import type { GrupoMuscular, DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'
import type { EjercicioEnDia, EstadoDia, RutinaData } from '@/app/(profe)/rutinas/[alumnoId]/page'

export const dynamic = 'force-dynamic'

const DIAS_ORDEN: DiaSemana[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]

function initWeek(): Record<DiaSemana, EstadoDia> {
  const d = {} as Record<DiaSemana, EstadoDia>
  for (const dia of DIAS_ORDEN) {
    d[dia] = { id: null, nombre: '', esDescanso: false, ejercicios: [] }
  }
  return d
}

async function getData(plantillaId: string) {
  const supabase = await createClient()

  const [ejerciciosResult, plantillaResult] = await Promise.all([
    supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
      .order('nombre'),
    supabase
      .from('rutinas')
      .select(`
        id, nombre, activa, fecha_inicio, is_template,
        dias:rutina_dias(
          id, dia_semana, nombre, orden, es_descanso, semana_numero,
          ejercicios:rutina_ejercicios(
            id, ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, notas, rpe_objetivo
          )
        )
      `)
      .eq('id', plantillaId)
      .eq('is_template', true)
      .maybeSingle(),
  ])

  const ejerciciosLib: EjercicioItem[] = ((ejerciciosResult.data as any[]) ?? []).map((ej) => ({
    id: ej.id,
    nombre: ej.nombre,
    descripcion: ej.descripcion,
    video_url: ej.video_url,
    grupos: (ej.grupos as any[]).map((g: any) => g.grupo as GrupoMuscular),
  }))

  const rawRutina = plantillaResult.data as any
  if (!rawRutina) return null

  const semanasSet = new Set<number>()
  const diasBySemana: Record<number, Record<DiaSemana, EstadoDia>> = {}

  const ejLibMap = new Map(ejerciciosLib.map((e) => [e.id, e]))

  for (const dia of (rawRutina.dias ?? [])) {
    const sem: number = dia.semana_numero ?? 1
    semanasSet.add(sem)
    if (!diasBySemana[sem]) diasBySemana[sem] = initWeek()

    const ejercicios: EjercicioEnDia[] = (dia.ejercicios ?? [])
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((re: any) => {
        const lib = ejLibMap.get(re.ejercicio_id)
        return {
          id: re.id,
          ejercicio_id: re.ejercicio_id,
          nombre: lib?.nombre ?? '',
          grupos: lib?.grupos ?? [],
          orden: re.orden,
          series: re.series,
          repeticiones: re.repeticiones,
          peso_objetivo: re.peso_objetivo,
          descanso_segundos: re.descanso_segundos,
          notas: re.notas,
          rpe_objetivo: re.rpe_objetivo ?? null,
        }
      })

    diasBySemana[sem][dia.dia_semana as DiaSemana] = {
      id: dia.id,
      nombre: dia.nombre ?? '',
      esDescanso: dia.es_descanso ?? false,
      ejercicios,
    }
  }

  if (semanasSet.size === 0) semanasSet.add(1)
  if (!diasBySemana[1]) diasBySemana[1] = initWeek()

  const rutinaData: RutinaData = {
    id: rawRutina.id,
    nombre: rawRutina.nombre,
    activa: rawRutina.activa,
    fecha_inicio: rawRutina.fecha_inicio ?? null,
    semanas: Array.from(semanasSet).sort((a, b) => a - b),
    dias: diasBySemana,
  }

  return { ejerciciosLib, rutinaData }
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlantillaEditPage({ params }: Props) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { ejerciciosLib, rutinaData } = data

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <Link
          href="/plantillas"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Plantillas
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">
          {rutinaData.nombre}
        </span>
      </div>

      {/* Builder en modo plantilla */}
      <RutinaBuilder
        alumnoId=""
        alumnoNombre=""
        rutinaInicial={rutinaData}
        ejerciciosLib={ejerciciosLib}
        templateMode
      />
    </div>
  )
}
