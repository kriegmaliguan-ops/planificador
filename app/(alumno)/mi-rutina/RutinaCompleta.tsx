'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { PlayCircle, Moon, Dumbbell, Clock, ChevronDown, ClipboardList, CheckCircle2 } from 'lucide-react'
import { BienestarCard } from '@/components/alumno/BienestarCard'
import { getWeekDates } from '@/lib/utils'

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

function getMes(semana: number) { return Math.ceil(semana / 4) }

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface Props {
  rutina: { id: string; nombre: string; dias: any[] }
  completadosHoy: string[]
  bienestarPorFecha: Record<string, { descanso: number; notas: string | null }>
  hoy: string
  /** Semana de la rutina que corresponde a la semana calendario actual (detectada por último entreno) */
  semanaDetectada: number
  /** Fecha de inicio de la rutina (Semana 1), para calcular rangos de fechas */
  fechaInicio: string | null
}

/**
 * Dado un día de semana y una fecha de referencia, devuelve la fecha YYYY-MM-DD
 * del día de la semana más cercano (≤ referencia) de ese mismo día.
 */
function getFechaParaDia(dia: DiaSemana, referencia: string): string {
  const targetIdx = DIAS_ORDER.indexOf(dia)
  const [y, m, d] = referencia.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const jsDay = base.getDay()
  const baseIdx = jsDay === 0 ? 6 : jsDay - 1
  let diff = baseIdx - targetIdx
  if (diff < 0) diff += 7
  base.setDate(base.getDate() - diff)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

export function RutinaCompleta({ rutina, completadosHoy, bienestarPorFecha, hoy, semanaDetectada, fechaInicio }: Props) {
  const completadosSet = new Set(completadosHoy)

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

  const [semanaActiva, setSemanaActiva] = useState<number>(semanas[0] ?? 1)
  const [diaActivo, setDiaActivo] = useState<DiaSemana | null>(null)

  const diasDeSemana = diasBySemana[semanaActiva] ?? {}

  function handleSemana(sem: number) {
    setSemanaActiva(sem)
    setDiaActivo(null)
  }

  // Calcular estado de cada día: completado / parcial / pendiente
  function getEstadoDia(dia: DiaSemana): 'completado' | 'parcial' | 'pendiente' | 'descanso' | 'vacio' {
    const diaData = diasDeSemana[dia]
    if (!diaData) return 'vacio'
    if (diaData.es_descanso) return 'descanso'
    const ejercicios: any[] = diaData.ejercicios ?? []
    if (ejercicios.length === 0) return 'vacio'
    const hechos = ejercicios.filter((e: any) => completadosSet.has(e.id)).length
    if (hechos === ejercicios.length) return 'completado'
    if (hechos > 0) return 'parcial'
    return 'pendiente'
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">

      {/* Título */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Mi Rutina</p>
        <h1 className="text-2xl font-bold text-slate-900">{rutina.nombre}</h1>
        <p className="text-sm text-slate-500 mt-1">{semanas.length} semana{semanas.length !== 1 ? 's' : ''} programadas</p>
      </div>

      {/* Registro de sueño — semana activa mapeada a su semana calendario */}
      {(() => {
        // Cada semana_numero se mapea a una semana calendario:
        // semanaDetectada → esta semana, semanaDetectada-1 → semana pasada, etc.
        const semanaDiff = semanaActiva - semanaDetectada
        const referenciaFecha = addDays(hoy, semanaDiff * 7)
        const fechaActiva = diaActivo ? getFechaParaDia(diaActivo, referenciaFecha) : referenciaFecha
        return (
          <BienestarCard
            key={fechaActiva}
            registroHoy={bienestarPorFecha[fechaActiva] ?? null}
            fecha={fechaActiva}
          />
        )
      })()}

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
                  className={`shrink-0 flex flex-col items-center rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                    semanaActiva === sem
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 active:scale-95'
                  }`}
                >
                  <span>Sem {sem}</span>
                  {fechaInicio && (
                    <span className={`text-[10px] font-normal leading-tight mt-0.5 ${
                      semanaActiva === sem ? 'text-slate-300' : 'text-slate-400'
                    }`}>
                      {getWeekDates(fechaInicio, sem)}
                    </span>
                  )}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_ORDER.map((dia) => {
          const estado = getEstadoDia(dia)
          const diaData = diasDeSemana[dia]
          const cantEj = diaData?.ejercicios?.length ?? 0
          const activo = diaActivo === dia

          return (
            <button
              key={dia}
              onClick={() => setDiaActivo(activo ? null : dia)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 min-h-[68px] transition-all active:scale-95 ${
                activo
                  ? 'bg-slate-900 text-white shadow-lg'
                  : estado === 'completado'
                  ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300'
                  : estado === 'parcial'
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'bg-white text-slate-700 ring-1 ring-slate-100 hover:ring-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold">{DIAS_SHORT[dia]}</span>

              {estado === 'vacio' || !diaData ? (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              ) : estado === 'descanso' ? (
                <Moon className={`h-3.5 w-3.5 ${activo ? 'opacity-60' : 'text-slate-300'}`} />
              ) : estado === 'completado' ? (
                <CheckCircle2 className={`h-4 w-4 ${activo ? 'text-white' : 'text-emerald-500'}`} />
              ) : (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  activo ? 'bg-white/20 text-white'
                  : estado === 'parcial' ? 'bg-blue-200 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
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
              <p className="mt-1 text-sm text-slate-500">Día de descanso — recuperate bien 😴</p>
            </div>
          </div>
        )

        const ejercicios: any[] = diaData.ejercicios ?? []
        const hechosCount = ejercicios.filter((e: any) => completadosSet.has(e.id)).length
        const totalCount = ejercicios.length
        const todoHecho = hechosCount === totalCount && totalCount > 0

        return (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            {/* Header del día */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="font-bold text-slate-900">{diaData.nombre || DIAS_LABELS[diaActivo]}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {todoHecho
                    ? <span className="text-emerald-600 font-semibold">✓ Completado hoy</span>
                    : hechosCount > 0
                    ? <span className="text-blue-600">{hechosCount}/{totalCount} hechos</span>
                    : <span>{totalCount} ejercicio{totalCount !== 1 ? 's' : ''} · Sem {semanaActiva}</span>
                  }
                </p>
              </div>
              {/* Botón Registrar — calculo la fecha real del día clickeado */}
              <Link
                href={(() => {
                  // Si tenemos fecha_inicio, calculamos la fecha exacta del día
                  if (fechaInicio) {
                    const diaIdx = DIAS_ORDER.indexOf(diaActivo)
                    const fechaCalculada = addDays(fechaInicio, (semanaActiva - 1) * 7 + diaIdx)
                    return `/rutina?fecha=${fechaCalculada}`
                  }
                  // Fallback al modo viejo (registra para hoy)
                  return `/rutina?semana=${semanaActiva}&dia=${diaActivo}`
                })()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 active:bg-blue-700 transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                {todoHecho ? 'Editar' : 'Registrar'}
              </Link>
            </div>

            {/* Lista de ejercicios */}
            <div className="divide-y divide-slate-50">
              {ejercicios.map((re: any, i: number) => {
                const ej = re.ejercicio
                const grupos: string[] = (ej?.grupos ?? [])
                  .map((g: any) => g.grupo?.nombre)
                  .filter(Boolean)
                const hecho = completadosSet.has(re.id)

                return (
                  <div key={re.id} className={`px-4 py-4 ${hecho ? 'bg-emerald-50/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* Número o check */}
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        hecho ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {hecho ? '✓' : i + 1}
                      </span>

                      {/* Nombre + grupos + video */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm leading-snug ${hecho ? 'text-slate-600' : 'text-slate-900'}`}>
                            {ej?.nombre ?? 'Ejercicio'}
                          </p>
                          {ej?.video_url && (
                            <a
                              href={ej.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-red-500 hover:text-red-600 transition-colors"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        {grupos.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {grupos.map((g) => (
                              <span key={g} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
                            {re.notas && <span className="italic">"{re.notas}"</span>}
                          </div>
                        )}
                      </div>

                      {/* Series × reps + peso */}
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${hecho ? 'text-slate-500' : 'text-slate-800'}`}>
                          {re.series} <span className="font-normal opacity-60">×</span> {re.repeticiones}
                        </p>
                        {re.peso_objetivo && (
                          <p className="text-xs text-slate-400 mt-0.5">{re.peso_objetivo} kg</p>
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
