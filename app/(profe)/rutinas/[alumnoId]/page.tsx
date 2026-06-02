import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PauseCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typed, typedList } from '@/lib/supabase/types-helper'
import { RutinaBuilder } from '@/components/rutinas/RutinaBuilder'
import { SuspenderAlumnoBtn } from '@/components/alumnos/SuspenderAlumnoBtn'
import type { Profile, GrupoMuscular, DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'

// ── Tipos para el builder ────────────────────────────────────────────────────

export interface EjercicioEnDia {
  id: string              // rutina_ejercicio.id
  ejercicio_id: string
  nombre: string
  grupos: GrupoMuscular[]
  orden: number
  series: number
  repeticiones: string
  peso_objetivo: number | null
  descanso_segundos: number | null
  notas: string | null
  rpe_objetivo: number | null
}

export interface EstadoDia {
  id: string | null       // rutina_dia.id (null = no existe en DB aún)
  nombre: string
  esDescanso: boolean
  calentamientoId: string | null
  ejercicios: EjercicioEnDia[]
}

export interface RutinaData {
  id: string
  nombre: string
  activa: boolean
  fecha_inicio: string | null
  semanas: number[]                                          // [1, 2, 3, ...]
  dias: Record<number, Record<DiaSemana, EstadoDia>>        // semana → dia → estado
}

// ── Fetch ────────────────────────────────────────────────────────────────────

const DIAS_ORDEN: DiaSemana[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]

function initWeek(): Record<DiaSemana, EstadoDia> {
  const d = {} as Record<DiaSemana, EstadoDia>
  for (const dia of DIAS_ORDEN) {
    d[dia] = { id: null, nombre: '', esDescanso: false, calentamientoId: null, ejercicios: [] }
  }
  return d
}

async function getData(alumnoId: string) {
  const supabase = await createClient()

  const [alumnoResult, ejerciciosResult, rutinaResult, plantillasResult, calentamientosResult, bloquesResult] = await Promise.all([
    supabase.from('profiles').select('id, nombre, apellido, suspendido').eq('id', alumnoId).single(),
    supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
      .order('nombre'),
    supabase
      .from('rutinas')
      .select(`
        id, nombre, activa, fecha_inicio,
        dias:rutina_dias(
          id, dia_semana, nombre, orden, es_descanso, semana_numero, calentamiento_id,
          ejercicios:rutina_ejercicios(
            id, ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, notas, rpe_objetivo
          )
        )
      `)
      .eq('alumno_id', alumnoId)
      .eq('activa', true)
      .maybeSingle(),
    supabase
      .from('rutinas')
      .select('id, nombre')
      .eq('is_template', true)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: { id: string; nombre: string }[] | null }>,
    supabase
      .from('calentamientos')
      .select('id, nombre, descripcion, duracion_minutos, video_url')
      .order('nombre') as unknown as Promise<{ data: any[] | null }>,
    supabase
      .from('bloques_dia')
      .select('id, nombre, ejercicios:bloque_ejercicios(id)')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: any[] | null }>,
  ])

  const alumno = typed<Pick<Profile, 'id' | 'nombre' | 'apellido' | 'suspendido'>>(alumnoResult).data
  if (!alumno) return null

  const ejerciciosLib: EjercicioItem[] = ((ejerciciosResult.data as any[]) ?? []).map((ej) => ({
    id: ej.id,
    nombre: ej.nombre,
    descripcion: ej.descripcion,
    video_url: ej.video_url,
    grupos: (ej.grupos as any[]).map((g: any) => g.grupo as GrupoMuscular),
  }))

  let rutinaData: RutinaData | null = null
  const rawRutina = rutinaResult.data as any

  if (rawRutina) {
    const semanasSet = new Set<number>()
    const diasBySemana: Record<number, Record<DiaSemana, EstadoDia>> = {}

    // Extraer todos los ejercicio_id únicos referenciados en la rutina
    const ejercicioIdsEnRutina = [
      ...new Set(
        (rawRutina.dias ?? []).flatMap((d: any) =>
          (d.ejercicios ?? []).map((e: any) => e.ejercicio_id).filter(Boolean)
        )
      ),
    ] as string[]

    // Query directo y específico: solo los ejercicios que usa esta rutina
    let ejLibMap = new Map(ejerciciosLib.map((e) => [e.id, e]))
    if (ejercicioIdsEnRutina.length > 0) {
      const { data: ejDirecto } = await supabase
        .from('ejercicios')
        .select('id, nombre, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
        .in('id', ejercicioIdsEnRutina)
      for (const ej of ejDirecto ?? []) {
        ejLibMap.set(ej.id, {
          id: ej.id,
          nombre: ej.nombre ?? '',
          descripcion: null,
          video_url: ej.video_url ?? null,
          grupos: ((ej.grupos ?? []) as any[]).map((g: any) => g.grupo as GrupoMuscular).filter(Boolean),
        })
      }
    }

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
        calentamientoId: dia.calentamiento_id ?? null,
        ejercicios,
      }
    }

    if (semanasSet.size === 0) semanasSet.add(1)
    if (!diasBySemana[1]) diasBySemana[1] = initWeek()

    rutinaData = {
      id: rawRutina.id,
      nombre: rawRutina.nombre,
      activa: rawRutina.activa,
      fecha_inicio: rawRutina.fecha_inicio ?? null,
      semanas: Array.from(semanasSet).sort((a, b) => a - b),
      dias: diasBySemana,
    }
  }

  const plantillas = (plantillasResult.data ?? []) as { id: string; nombre: string }[]
  const calentamientos = (calentamientosResult.data ?? []) as Array<{
    id: string; nombre: string; descripcion: string | null; duracion_minutos: number | null; video_url: string | null
  }>
  const bloques = ((bloquesResult.data ?? []) as any[]).map((b) => ({
    id: b.id,
    nombre: b.nombre,
    cantEjercicios: (b.ejercicios ?? []).length,
  }))
  return { alumno, ejerciciosLib, rutinaData, plantillas, calentamientos, bloques }
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ alumnoId: string }>
}

export default async function RutinaBuilderPage({ params }: Props) {
  const { alumnoId } = await params
  const data = await getData(alumnoId)

  if (!data) notFound()

  const { alumno, ejerciciosLib, rutinaData, plantillas, calentamientos, bloques } = data

  if (alumno.suspendido === true) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <Link
            href={`/alumnos/${alumnoId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {alumno.nombre} {alumno.apellido ?? ''}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <PauseCircle className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Alumno suspendido</p>
            <p className="mt-1 text-sm text-slate-500">
              {alumno.nombre} tiene el acceso pausado. Reactivalo para editar su rutina.
            </p>
          </div>
          <SuspenderAlumnoBtn alumnoId={alumnoId} suspendido={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <Link
          href={`/alumnos/${alumnoId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {alumno.nombre} {alumno.apellido ?? ''}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">
          {rutinaData ? rutinaData.nombre : 'Nueva rutina'}
        </span>
      </div>

      {/* Builder */}
      <RutinaBuilder
        alumnoId={alumnoId}
        alumnoNombre={`${alumno.nombre} ${alumno.apellido ?? ''}`.trim()}
        rutinaInicial={rutinaData}
        ejerciciosLib={ejerciciosLib}
        plantillasDisponibles={plantillas}
        calentamientosDisponibles={calentamientos}
        bloquesDisponibles={bloques}
      />
    </div>
  )
}
