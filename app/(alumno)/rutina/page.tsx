import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, PartyPopper, CalendarDays, Moon, ArrowLeft, Flame } from 'lucide-react'
// PartyPopper kept for empty state
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { getHoyChile, getDiaHoy, DIAS_LABELS, DIAS_SEMANA, getSemanaActualPorFecha } from '@/lib/utils'
import { EjercicioHoyCard } from '@/components/alumno/EjercicioHoyCard'
import { BienestarCard } from '@/components/alumno/BienestarCard'
import { DateNav } from '@/components/alumno/DateNav'
import { RegistrarTodoBtn } from '@/components/alumno/RegistrarTodoBtn'
import { CalentamientoCard } from '@/components/alumno/CalentamientoCard'
import { EjerciciosDelDia } from '@/components/alumno/EjerciciosDelDia'
import type { Profile, GrupoMuscular, DiaSemana } from '@/lib/types/database'
import type { EjercicioHoyData } from '@/components/alumno/EjercicioHoyCard'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SemanaItem {
  dia: DiaSemana
  nombre: string | null
  cantEjercicios: number
  esDescanso: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDiaFromFecha(fecha: string): DiaSemana {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return days[date.getDay()]
}

// ── Racha y semana ────────────────────────────────────────────────────────────

interface RachaInfo {
  racha: number          // días consecutivos entrenados hasta hoy
  semanaActual: string[] // fechas 'YYYY-MM-DD' entrenadas esta semana (lun–dom)
  lunes: string          // fecha del lunes de esta semana
}

async function getRachaYSemana(alumnoId: string, hoy: string): Promise<RachaInfo> {
  const supabase = await createClient()

  // Calcular lunes de la semana actual
  const [y, m, d] = hoy.split('-').map(Number)
  const hoyDate = new Date(y, m - 1, d)
  const dow = hoyDate.getDay() // 0=dom,1=lun,...,6=sab
  const diffLunes = dow === 0 ? -6 : 1 - dow
  const lunesDate = new Date(hoyDate)
  lunesDate.setDate(hoyDate.getDate() + diffLunes)
  const lunes = lunesDate.toISOString().slice(0, 10)

  // Pedir registros de los últimos 90 días
  const hace90 = new Date(hoyDate)
  hace90.setDate(hoyDate.getDate() - 90)
  const desde = hace90.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('registros_progreso')
    .select('fecha')
    .eq('alumno_id', alumnoId)
    .gte('fecha', desde)
    .lte('fecha', hoy)
    .order('fecha', { ascending: false }) as { data: { fecha: string }[] | null }

  // Unique dates
  const fechasSet = new Set((data ?? []).map((r) => r.fecha))

  // Calcular racha: días consecutivos hacia atrás desde hoy
  let racha = 0
  const cursor = new Date(hoyDate)
  while (true) {
    const f = cursor.toISOString().slice(0, 10)
    if (fechasSet.has(f)) {
      racha++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  // Días de la semana actual (lun–dom) que tienen registros
  const semanaActual: string[] = []
  const cursorSem = new Date(lunesDate)
  for (let i = 0; i < 7; i++) {
    const f = cursorSem.toISOString().slice(0, 10)
    if (fechasSet.has(f)) semanaActual.push(f)
    cursorSem.setDate(cursorSem.getDate() + 1)
  }

  return { racha, semanaActual, lunes }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function getDatosDia(
  alumnoId: string,
  fecha: string,
  semanaOverride?: number,
  diaOverride?: DiaSemana
) {
  const supabase = await createClient()
  const diaDelFecha = getDiaFromFecha(fecha)

  const { data: rawRutina } = await supabase
    .from('rutinas')
    .select(`
      id, nombre, fecha_inicio,
      dias:rutina_dias(
        id, dia_semana, semana_numero, nombre, es_descanso, calentamiento_id,
        calentamiento:calentamientos(id, nombre, descripcion, duracion_minutos, video_url),
        ejercicios:rutina_ejercicios(
          id, orden, series, repeticiones, peso_objetivo, descanso_segundos, duracion_segundos, notas, rpe_objetivo, modalidad, agrupacion,
          ejercicio:ejercicios(id, nombre, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre)))
        )
      )
    `)
    .eq('alumno_id', alumnoId)
    .eq('activa', true)
    .maybeSingle() as { data: any | null }

  if (!rawRutina) return { rutina: null, fechaInicio: null, ejerciciosHoy: [], semana: [], bienestarHoy: null, calentamientoHoy: null }

  // Seleccionar el día: por semana/dia override o por día de la fecha
  let diaHoy: any
  if (semanaOverride !== undefined && diaOverride) {
    diaHoy = (rawRutina.dias ?? []).find(
      (d: any) => d.dia_semana === diaOverride && d.semana_numero === semanaOverride
    )
  } else {
    const matchingDias = (rawRutina.dias ?? []).filter((d: any) => d.dia_semana === diaDelFecha)
    if (matchingDias.length <= 1) {
      diaHoy = matchingDias[0] ?? null
    } else {
      // Rutina multi-semana: detectar semana activa por fecha de inicio (cronológico)
      const maxSemana = Math.max(...(rawRutina.dias ?? []).map((d: any) => d.semana_numero ?? 1), 1)
      const semanaActiva = rawRutina.fecha_inicio
        ? getSemanaActualPorFecha(rawRutina.fecha_inicio, fecha, maxSemana)
        : 1
      diaHoy = matchingDias.find((d: any) => d.semana_numero === semanaActiva) ?? matchingDias[0]
    }
  }

  const esDescanso = diaHoy?.es_descanso ?? false
  const rutinaEjerciciosIds: string[] = diaHoy && !esDescanso
    ? (diaHoy.ejercicios ?? []).map((re: any) => re.id)
    : []

  // Último registro histórico por ejercicio (antes de la fecha seleccionada)
  const ultimosRegistros: Record<string, { peso: number | null; reps: string | null }> = {}
  if (rutinaEjerciciosIds.length > 0) {
    const { data: historico } = await supabase
      .from('registros_progreso')
      .select('rutina_ejercicio_id, peso_utilizado, repeticiones_realizadas, fecha')
      .eq('alumno_id', alumnoId)
      .in('rutina_ejercicio_id', rutinaEjerciciosIds)
      .lt('fecha', fecha)
      .order('fecha', { ascending: false }) as { data: any[] | null }

    for (const r of historico ?? []) {
      if (!ultimosRegistros[r.rutina_ejercicio_id]) {
        ultimosRegistros[r.rutina_ejercicio_id] = {
          peso: r.peso_utilizado,
          reps: r.repeticiones_realizadas,
        }
      }
    }
  }

  // Registros de la fecha seleccionada
  const registrosDia: Record<string, any> = {}
  if (rutinaEjerciciosIds.length > 0) {
    const { data: diaData } = await supabase
      .from('registros_progreso')
      .select('rutina_ejercicio_id, series_completadas, repeticiones_realizadas, peso_utilizado, pesos_por_serie, rpe')
      .eq('alumno_id', alumnoId)
      .in('rutina_ejercicio_id', rutinaEjerciciosIds)
      .eq('fecha', fecha) as { data: any[] | null }

    for (const r of diaData ?? []) {
      registrosDia[r.rutina_ejercicio_id] = r
    }
  }

  // Bienestar del día seleccionado
  const { data: bienestarRaw } = await supabase
    .from('registros_bienestar')
    .select('descanso, notas')
    .eq('alumno_id', alumnoId)
    .eq('fecha', fecha)
    .maybeSingle() as { data: { descanso: number; notas: string | null } | null }

  const ejerciciosHoy: EjercicioHoyData[] = (diaHoy?.ejercicios ?? [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((re: any) => ({
      rutinaEjercicioId: re.id,
      nombre: re.ejercicio?.nombre ?? '',
      grupos: (re.ejercicio?.grupos ?? []).map((g: any) => g.grupo as GrupoMuscular),
      video_url: re.ejercicio?.video_url ?? null,
      series: re.series,
      repeticiones: re.repeticiones,
      peso_objetivo: re.peso_objetivo,
      descanso_segundos: re.descanso_segundos,
      duracion_segundos: re.duracion_segundos ?? null,
      notas: re.notas,
      rpe_objetivo: re.rpe_objetivo ?? null,
      modalidad: re.modalidad ?? 'normal',
      agrupacion: re.agrupacion ?? null,
      ultimoPeso: ultimosRegistros[re.id]?.peso ?? null,
      ultimasReps: ultimosRegistros[re.id]?.reps ?? null,
      registroHoy: registrosDia[re.id] ?? null,
    }))

  const semana: SemanaItem[] = DIAS_SEMANA.map((dia) => {
    const d = (rawRutina.dias ?? []).find((x: any) => x.dia_semana === dia)
    return {
      dia,
      nombre: d?.nombre ?? null,
      cantEjercicios: d?.ejercicios?.length ?? 0,
      esDescanso: d?.es_descanso ?? false,
    }
  })

  // Calentamiento del día (puede venir como array u objeto según Supabase join)
  const rawCal = diaHoy?.calentamiento
  const calentamientoHoy = rawCal
    ? Array.isArray(rawCal)
      ? (rawCal[0] ?? null)
      : rawCal
    : null

  return {
    rutina: { id: rawRutina.id, nombre: rawRutina.nombre },
    fechaInicio: (rawRutina.fecha_inicio as string | null) ?? null,
    diaHoyNombre: diaHoy?.nombre ?? null,
    semanaNumero: diaHoy?.semana_numero ?? null,
    esDescanso,
    ejerciciosHoy,
    semana,
    hechos: Object.keys(registrosDia).length,
    bienestarHoy: bienestarRaw ?? null,
    calentamientoHoy,
    diaDelFecha,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ fecha?: string; semana?: string; dia?: string }>
}

export default async function RutinaHoyPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('id').eq('id', user.id).single()
  )
  if (!profile) redirect('/login')

  // Fecha en Chile
  const hoyStr = getHoyChile()
  const { fecha: fechaParam, semana: semanaParam, dia: diaParam } = await searchParams

  // Modo semana/dia: desde mi-rutina
  const semanaOverride = semanaParam ? Number(semanaParam) : undefined
  const diaOverride = (diaParam as DiaSemana | undefined)
  const modoSemana = semanaOverride !== undefined && !!diaOverride

  // En modo semana: registrar para hoy
  const fecha = modoSemana
    ? hoyStr
    : (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) && fechaParam <= hoyStr ? fechaParam : hoyStr)
  const esHoy = fecha === hoyStr

  const [
    { rutina, fechaInicio, diaHoyNombre, semanaNumero, esDescanso, ejerciciosHoy, semana, hechos, bienestarHoy, calentamientoHoy, diaDelFecha },
    rachaInfo,
  ] = await Promise.all([
    getDatosDia(profile.id, fecha, semanaOverride, diaOverride),
    getRachaYSemana(profile.id, hoyStr),
  ])

  if (!rutina) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <Dumbbell className="mb-4 h-14 w-14 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Todavía no tenés rutina</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tu profe todavía no te asignó una rutina. ¡Ya llegará!
        </p>
      </div>
    )
  }

  // Rutina asignada pero todavía no empezó
  if (fechaInicio && fechaInicio > hoyStr) {
    const [fy, fm, fd] = fechaInicio.split('-').map(Number)
    const fechaFormateada = new Date(fy, fm - 1, fd).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
          <CalendarDays className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Tu rutina todavía no empezó</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tu profe programó el inicio para el{' '}
          <span className="font-semibold text-slate-700">{fechaFormateada}</span>.
        </p>
        <p className="mt-1 text-xs text-slate-400">¡Preparate, que se viene!</p>
      </div>
    )
  }

  const diaLabel = modoSemana && diaOverride
    ? DIAS_LABELS[diaOverride]
    : (diaDelFecha ? DIAS_LABELS[diaDelFecha] : '')
  const totalEjercicios = ejerciciosHoy.length
  const completados = hechos ?? 0

  const rpeValues = ejerciciosHoy
    .filter((e) => e.registroHoy?.rpe != null)
    .map((e) => e.registroHoy!.rpe as number)
  const rpePromedio = rpeValues.length >= 2
    ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
    : null

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

      {/* Botón volver (modo semana) o DateNav normal */}
      {modoSemana ? (
        <Link
          href="/mi-rutina"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mi rutina
        </Link>
      ) : (
        <DateNav fecha={fecha} />
      )}

      {/* Header del día */}
      <div className="rounded-2xl bg-slate-900 px-5 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {rutina.nombre}
              {modoSemana && semanaNumero && (
                <span className="ml-2 text-slate-500">· Sem {semanaNumero}</span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {diaHoyNombre || diaLabel}
            </h1>
          </div>
          {esDescanso
            ? <Moon className="h-6 w-6 text-slate-500" />
            : <CalendarDays className="h-6 w-6 text-slate-500" />
          }
        </div>

        {totalEjercicios > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>{completados} de {totalEjercicios} completados</span>
              <span>{Math.round((completados / totalEjercicios) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(completados / totalEjercicios) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sueño del día que se está viendo */}
      <BienestarCard registroHoy={bienestarHoy} fecha={fecha} hoy={hoyStr} />

      {/* Racha + semana — solo en vista de hoy */}
      {esHoy && !modoSemana && (() => {
        const { racha, semanaActual, lunes } = rachaInfo
        const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
        return (
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              {/* Racha */}
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  racha > 0 ? 'bg-orange-100' : 'bg-slate-100'
                }`}>
                  <Flame className={`h-5 w-5 ${racha > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Racha actual</p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {racha} {racha === 1 ? 'día' : 'días'}
                  </p>
                </div>
              </div>

              {/* Dots de la semana */}
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-slate-400">Esta semana</p>
                <div className="flex gap-1.5">
                  {diasSemana.map((letra, i) => {
                    const cursorDate = new Date(
                      Number(lunes.slice(0, 4)),
                      Number(lunes.slice(5, 7)) - 1,
                      Number(lunes.slice(8, 10)) + i
                    )
                    const fechaDia = cursorDate.toISOString().slice(0, 10)
                    const esFuturo = fechaDia > hoyStr
                    const entreno = semanaActual.includes(fechaDia)
                    const esHoyDot = fechaDia === hoyStr
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-medium text-slate-400">{letra}</span>
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          entreno
                            ? 'bg-blue-500'
                            : esFuturo
                            ? 'bg-slate-100'
                            : esHoyDot
                            ? 'bg-slate-200 ring-2 ring-blue-300'
                            : 'bg-slate-200'
                        }`} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Día de descanso */}
      {esDescanso ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-100">
          <Moon className="h-12 w-12 text-slate-300" />
          <div>
            <p className="text-lg font-bold text-slate-900">Día de descanso</p>
            <p className="mt-1 text-sm text-slate-500">Recuperate bien 😴</p>
          </div>
        </div>
      ) : ejerciciosHoy.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-100">
          <PartyPopper className="h-12 w-12 text-yellow-400" />
          <div>
            <p className="text-lg font-bold text-slate-900">Sin ejercicios</p>
            <p className="mt-1 text-sm text-slate-500">No hay ejercicios programados para este día.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Calentamiento del día (si está asignado) */}
          {calentamientoHoy && <CalentamientoCard calentamiento={calentamientoHoy} />}

          <EjerciciosDelDia ejercicios={ejerciciosHoy} fecha={fecha} />

          <RegistrarTodoBtn
            ejercicios={ejerciciosHoy.map((e) => ({
              rutinaEjercicioId: e.rutinaEjercicioId,
              series: e.series,
              repeticiones: e.repeticiones,
              registrado: e.registroHoy != null,
            }))}
            fecha={fecha}
          />

          {rpePromedio !== null && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">RPE promedio</span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold text-white ${
                rpePromedio <= 4 ? 'bg-lime-500'
                : rpePromedio <= 6 ? 'bg-yellow-500'
                : rpePromedio <= 8 ? 'bg-orange-500'
                : 'bg-red-600'
              }`}>
                {rpePromedio} / 10
              </span>
            </div>
          )}
        </>
      )}

    </div>
  )
}
