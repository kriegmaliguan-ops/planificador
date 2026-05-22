'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { PlayCircle, Moon, Dumbbell, Clock, ChevronDown, ClipboardList } from 'lucide-react'

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

const DIAS_ORDER: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

const DIAS_LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const DIAS_SHORT: Record<DiaSemana, string> = {
  lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J',
  viernes: 'V', sabado: 'S', domingo: 'D',
}

function getTodayDia(): DiaSemana {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'long',
  }).format(new Date())
  const map: Record<string, DiaSemana> = {
    Sunday: 'domingo', Monday: 'lunes', Tuesday: 'martes',
    Wednesday: 'miercoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sabado',
  }
  return map[dayName] ?? 'lunes'
}

function getMes(semana: number) { return Math.ceil(semana / 4) }

interface Props {
  rutina: { id: string; nombre: string; dias: any[] }
}

export function RutinaCompleta({ rutina }: Props) {
  // ── Procesar datos ────────────────────────────────────────────────────────
  const semanasSet = new Set<number>()
  const diasBySemana: Record<number, Partial<Record<DiaSemana, any>>> = {}

  for (const dia of rutina.dias ?? []) {
    const sem: number = dia.semana_numero ?? 1
    semanasSet.add(sem)
    if (!diasBySemana[sem]) diasBySemana[sem] = {}
    diasBySemana[sem][dia.dia_semana as DiaSemana] = {
      ...dia,
      ejercicios: [...(dia.ejercicios ?? [])].sort((a: any, b: any) => a.orden - b.orden),
    }
  }

  const semanas = Array.from(semanasSet).sort((a, b) => a - b)
  const hoy = getTodayDia()

  const [semanaActiva, setSemanaActiva] = useState<number>(semanas[0] ?? 1)
  const [diaActivo, setDiaActivo] = useState<DiaSemana | null>(null)

  const diasDeSemana = diasBySemana[semanaActiva] ?? {}

  function handleSemana(sem: number) {
    setSemanaActiva(sem)
    setDiaActivo(null)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">

      {/* Título */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Mi Rutina</p>
        <h1 className="text-2xl font-bold text-slate-900">{rutina.nombre}</h1>
        <p className="text-sm text-slate-500 mt-1">{semanas.length} semana{semanas.length !== 1 ? 's' : ''} programadas</p>
      </div>

      {/* Selector de semanas */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex items-center gap-2 w-max pb-1">
          {semanas.map((sem, idx) => {
            const mes = getMes(sem)
            const prevMes = idx > 0 ? getMes(semanas[idx - 1]) : null
            const showMes = mes !== prevMes
            return (
              <Fragment key={sem}>
                {showMes && (
                  <div className={`flex items-center ${idx > 0 ? 'ml-2' : ''}`}>
                    {idx > 0 && <div className="mr-3 h-6 w-px bg-slate-200" />}
                    <span className="mr-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Mes {mes}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleSemana(sem)}
                  className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                    semanaActiva === sem
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 active:scale-95'
                  }`}
                >
                  Sem {sem}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_ORDER.map((dia) => {
          const diaData = diasDeSemana[dia]
          const esDescanso = diaData?.es_descanso ?? !diaData
          const cantEj = diaData?.ejercicios?.length ?? 0
          const esHoy = dia === hoy
          const activo = diaActivo === dia

          return (
            <button
              key={dia}
              onClick={() => setDiaActivo(activo ? null : dia)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 min-h-[68px] transition-all active:scale-95 ${
                activo
                  ? 'bg-slate-900 text-white shadow-lg'
                  : esHoy && diaData
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md'
                  : esHoy
                  ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-200'
                  : 'bg-white text-slate-700 ring-1 ring-slate-100 hover:ring-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold">{DIAS_SHORT[dia]}</span>
              {!diaData ? (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              ) : esDescanso ? (
                <Moon className={`h-3.5 w-3.5 ${activo ? 'opacity-60' : 'text-slate-300'}`} />
              ) : (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  activo ? 'bg-white/20 text-white' : esHoy ? 'bg-white/30' : 'bg-blue-100 text-blue-700'
                }`}>
                  {cantEj}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Detalle del día seleccionado */}
      {diaActivo && (() => {
        const diaData = diasDeSemana[diaActivo]

        if (!diaData) return (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="font-semibold text-slate-700">Sin ejercicios</p>
            <p className="mt-1 text-sm text-slate-400">No hay ejercicios programados este día.</p>
          </div>
        )

        if (diaData.es_descanso) return (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-slate-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Moon className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{diaData.nombre || DIAS_LABELS[diaActivo]}</p>
              <p className="mt-1 text-sm text-slate-500">Día de descanso activo — recuperate bien 😴</p>
            </div>
          </div>
        )

        const ejercicios: any[] = diaData.ejercicios ?? []

        return (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            {/* Header del día */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="font-bold text-slate-900">{diaData.nombre || DIAS_LABELS[diaActivo]}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''} · Sem {semanaActiva}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {diaActivo === hoy && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    ¡Hoy!
                  </span>
                )}
                {/* Botón Registrar */}
                <Link
                  href={`/rutina?semana=${semanaActiva}&dia=${diaActivo}`}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 active:bg-blue-700 transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Registrar
                </Link>
              </div>
            </div>

            {/* Lista de ejercicios */}
            <div className="divide-y divide-slate-50">
              {ejercicios.map((re: any, i: number) => {
                const ej = re.ejercicio
                const grupos: string[] = (ej?.grupos ?? [])
                  .map((g: any) => g.grupo?.nombre)
                  .filter(Boolean)

                return (
                  <div key={re.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      {/* Número */}
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>

                      {/* Nombre + grupos + video */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm leading-snug">
                            {ej?.nombre ?? 'Ejercicio'}
                          </p>
                          {ej?.video_url && (
                            <a
                              href={ej.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-red-500 hover:text-red-600 transition-colors"
                              title="Ver video"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        {grupos.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {grupos.map((g) => (
                              <span
                                key={g}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        {(re.notas || re.descanso_segundos) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {re.descanso_segundos && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {re.descanso_segundos}s
                              </span>
                            )}
                            {re.notas && (
                              <span className="italic">"{re.notas}"</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Series × reps + peso */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-800">
                          {re.series} <span className="text-slate-400 font-normal">×</span> {re.repeticiones}
                        </p>
                        {re.peso_objetivo && (
                          <p className="text-xs text-slate-500 mt-0.5">{re.peso_objetivo} kg</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Instrucción cuando no hay día seleccionado */}
      {!diaActivo && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/60 py-4 text-sm text-slate-400 ring-1 ring-slate-100">
          <ChevronDown className="h-4 w-4" />
          Tocá un día para ver sus ejercicios
        </div>
      )}
    </div>
  )
}
