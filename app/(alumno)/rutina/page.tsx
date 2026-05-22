import { redirect } from 'next/navigation'
import { Dumbbell, PartyPopper, CalendarDays, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { getDiaHoy, DIAS_LABELS, DIAS_SEMANA } from '@/lib/utils'
import { EjercicioHoyCard } from '@/components/alumno/EjercicioHoyCard'
import { BienestarCard } from '@/components/alumno/BienestarCard'
import { DateNav } from '@/components/alumno/DateNav'
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

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function getDatosDia(alumnoId: string, fecha: string) {
  const supabase = await createClient()
  const diaDelFecha = getDiaFromFecha(fecha)

  const { data: rawRutina } = await supabase
    .from('rutinas')
    .select(`
      id, nombre,
      dias:rutina_dias(
        id, dia_semana, nombre, es_descanso,
        ejercicios:rutina_ejercicios(
          id, series, repeticiones, peso_objetivo, descanso_segundos, notas,
          ejercicio:ejercicios(id, nombre, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre)))
        )
      )
    `)
    .eq('alumno_id', alumnoId)
    .eq('activa', true)
    .maybeSingle() as { data: any | null }

  if (!rawRutina) return { rutina: null, ejerciciosHoy: [], semana: [], bienestarHoy: null }

  const diaHoy = (rawRutina.dias ?? []).find((d: any) => d.dia_semana === diaDelFecha)
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
      .select('rutina_ejercicio_id, series_completadas, repeticiones_realizadas, peso_utilizado, rpe')
      .eq('alumno_id', alumnoId)
      .in('rutina_ejercicio_id', rutinaEjerciciosIds)
      .eq('fecha', fecha) as { data: any[] | null }

    for (const r of diaData ?? []) {
      registrosDia[r.rutina_ejercicio_id] = r
    }
  }

  // Bienestar de la fecha seleccionada
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
      notas: re.notas,
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

  return {
    rutina: { id: rawRutina.id, nombre: rawRutina.nombre },
    diaHoyNombre: diaHoy?.nombre ?? null,
    esDescanso,
    ejerciciosHoy,
    semana,
    hechos: Object.keys(registrosDia).length,
    bienestarHoy: bienestarRaw ?? null,
    diaDelFecha,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ fecha?: string }>
}

export default async function RutinaHoyPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('id').eq('id', user.id).single()
  )
  if (!profile) redirect('/login')

  // Determinar fecha a mostrar
  const { fecha: fechaParam } = await searchParams
  const hoyStr = new Date().toISOString().split('T')[0]
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) && fechaParam <= hoyStr
    ? fechaParam
    : hoyStr
  const esHoy = fecha === hoyStr

  const { rutina, diaHoyNombre, esDescanso, ejerciciosHoy, semana, hechos, bienestarHoy, diaDelFecha } =
    await getDatosDia(profile.id, fecha)

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

  const diaLabel = diaDelFecha ? DIAS_LABELS[diaDelFecha] : ''
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

      {/* Navegador de fecha */}
      <DateNav fecha={fecha} />

      {/* Header del día */}
      <div className="rounded-2xl bg-slate-900 px-5 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {rutina.nombre}
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

      {/* Encuesta de sueño */}
      <BienestarCard registroHoy={bienestarHoy} />

      {/* Día de descanso */}
      {esDescanso ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-100">
          <Moon className="h-12 w-12 text-slate-300" />
          <div>
            <p className="text-lg font-bold text-slate-900">Día de descanso</p>
            <p className="mt-1 text-sm text-slate-500">
              {esHoy ? '¡Recuperate bien!' : 'Este día era de descanso.'}
            </p>
          </div>
        </div>
      ) : ejerciciosHoy.length === 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-100">
            <PartyPopper className="h-12 w-12 text-yellow-400" />
            <div>
              <p className="text-lg font-bold text-slate-900">Sin ejercicios</p>
              <p className="mt-1 text-sm text-slate-500">
                No hay ejercicios programados para este día.
              </p>
            </div>
          </div>

          {/* Vista de la semana */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tu semana
            </p>
            {semana.map(({ dia, nombre, cantEjercicios, esDescanso: esDes }) => (
              <div
                key={dia}
                className={`flex items-center justify-between px-4 py-3 ${dia === diaDelFecha ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${dia === diaDelFecha ? 'text-blue-700' : 'text-slate-700'}`}>
                    {DIAS_LABELS[dia]}
                  </span>
                  {nombre && <span className="text-xs text-slate-600">{nombre}</span>}
                </div>
                {esDes ? (
                  <span className="text-xs text-slate-500">Descanso</span>
                ) : cantEjercicios > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {cantEjercicios} ejerc.
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Descanso</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {completados === totalEjercicios && totalEjercicios > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
              <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">
                {esHoy ? '¡Sesión completa! Buen trabajo 💪' : 'Sesión registrada ✓'}
              </p>
            </div>
          )}

          {ejerciciosHoy.map((ej, i) => (
            <EjercicioHoyCard
              key={ej.rutinaEjercicioId}
              ejercicio={ej}
              index={i}
              fecha={fecha}
            />
          ))}

          {rpePromedio !== null && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">RPE promedio de sesión</span>
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
