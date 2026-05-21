'use client'

import { Fragment, useState, useTransition } from 'react'
import { Plus, Pencil, Check, Dumbbell, Moon, Copy } from 'lucide-react'
import { DIAS_SEMANA, DIAS_LABELS } from '@/lib/utils'
import {
  crearRutina,
  actualizarNombreRutina,
  actualizarNombreDia,
  toggleDiaDescanso,
  copiarDia,
} from '@/app/(profe)/rutinas/[alumnoId]/actions'
import { EjercicioDiaRow } from './EjercicioDiaRow'
import { AgregarEjercicioModal } from './AgregarEjercicioModal'
import type { DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'
import type { RutinaData, EstadoDia, EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface RutinaBuilderProps {
  alumnoId: string
  alumnoNombre: string
  rutinaInicial: RutinaData | null
  ejerciciosLib: EjercicioItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMes(semana: number): number {
  return Math.ceil(semana / 4)
}

function initWeekDias(): Record<DiaSemana, EstadoDia> {
  const d = {} as Record<DiaSemana, EstadoDia>
  for (const dia of DIAS_SEMANA) {
    d[dia] = { id: null, nombre: '', esDescanso: false, ejercicios: [] }
  }
  return d
}

// ── Crear rutina ──────────────────────────────────────────────────────────────

function CrearRutinaForm({
  alumnoId,
  alumnoNombre,
  onCreada,
}: {
  alumnoId: string
  alumnoNombre: string
  onCreada: (rutina: RutinaData) => void
}) {
  const [nombre, setNombre] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    startTransition(async () => {
      const result = await crearRutina(alumnoId, nombre.trim())
      if (result.error) { setError(result.error); return }

      onCreada({
        id: result.id!,
        nombre: nombre.trim(),
        activa: true,
        semanas: [1],
        dias: { 1: initWeekDias() },
      })
    })
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Dumbbell className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Nueva rutina para {alumnoNombre}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Esta será la rutina activa del alumno.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Nombre de la rutina</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Fuerza + Hipertrofia — Enero"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending || !nombre.trim()}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Creando...' : 'Crear rutina'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Builder principal ─────────────────────────────────────────────────────────

export function RutinaBuilder({
  alumnoId,
  alumnoNombre,
  rutinaInicial,
  ejerciciosLib,
}: RutinaBuilderProps) {
  const [rutina, setRutina] = useState<RutinaData | null>(rutinaInicial)
  const [semanaActiva, setSemanaActiva] = useState<number>(rutinaInicial?.semanas[0] ?? 1)
  const [diaActivo, setDiaActivo] = useState<DiaSemana>('lunes')
  const [agregarOpen, setAgregarOpen] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [editandoDia, setEditandoDia] = useState(false)
  const [copiarAbierto, setCopiarAbierto] = useState(false)
  const [, startTransition] = useTransition()

  if (!rutina) {
    return (
      <CrearRutinaForm
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        onCreada={(r) => { setRutina(r); setSemanaActiva(1) }}
      />
    )
  }

  const diaData = rutina.dias[semanaActiva]?.[diaActivo] ?? { id: null, nombre: '', esDescanso: false, ejercicios: [] }

  // ── Actualizar nombre de rutina
  function handleGuardarNombreRutina(nuevo: string) {
    if (!nuevo.trim() || nuevo === rutina!.nombre) { setEditandoNombre(false); return }
    startTransition(async () => {
      await actualizarNombreRutina(rutina!.id, nuevo.trim(), alumnoId)
      setRutina((r) => r ? { ...r, nombre: nuevo.trim() } : r)
      setEditandoNombre(false)
    })
  }

  // ── Actualizar nombre del día
  function handleGuardarNombreDia(nuevo: string) {
    setEditandoDia(false)
    if (!diaData.id) return
    startTransition(async () => {
      await actualizarNombreDia(diaData.id!, nuevo, alumnoId)
      setRutina((r) => {
        if (!r) return r
        return {
          ...r,
          dias: {
            ...r.dias,
            [semanaActiva]: {
              ...r.dias[semanaActiva],
              [diaActivo]: { ...diaData, nombre: nuevo },
            },
          },
        }
      })
    })
  }

  // ── Toggle día de descanso
  function handleToggleDescanso() {
    const nuevo = !diaData.esDescanso
    startTransition(async () => {
      const result = await toggleDiaDescanso(rutina!.id, diaActivo, semanaActiva, diaData.id, nuevo, alumnoId)
      if (!result.error) {
        setRutina((r) => {
          if (!r) return r
          return {
            ...r,
            dias: {
              ...r.dias,
              [semanaActiva]: {
                ...r.dias[semanaActiva],
                [diaActivo]: {
                  ...diaData,
                  id: result.diaId ?? diaData.id,
                  esDescanso: nuevo,
                },
              },
            },
          }
        })
      }
    })
  }

  // ── Copiar día
  function handleCopiarA(destino: DiaSemana) {
    setCopiarAbierto(false)
    if (!diaData.id) return
    startTransition(async () => {
      const result = await copiarDia(rutina!.id, diaData.id!, destino, semanaActiva, alumnoId)
      if (!result.error) {
        setRutina((r) => {
          if (!r) return r
          return {
            ...r,
            dias: {
              ...r.dias,
              [semanaActiva]: {
                ...r.dias[semanaActiva],
                [destino]: {
                  ...r.dias[semanaActiva][destino],
                  ejercicios: [...diaData.ejercicios],
                  esDescanso: false,
                },
              },
            },
          }
        })
      }
    })
  }

  // ── Agregar semana
  function handleAgregarSemana() {
    const maxSem = Math.max(...rutina!.semanas, 0)
    const nueva = maxSem + 1
    setRutina((r) => ({
      ...r!,
      semanas: [...r!.semanas, nueva],
      dias: { ...r!.dias, [nueva]: initWeekDias() },
    }))
    setSemanaActiva(nueva)
  }

  // ── Agregar ejercicio
  function handleEjercicioAgregado(newDiaId: string, ejercicio: EjercicioEnDia) {
    setRutina((r) => {
      if (!r) return r
      const diaPrev = r.dias[semanaActiva][diaActivo]
      return {
        ...r,
        dias: {
          ...r.dias,
          [semanaActiva]: {
            ...r.dias[semanaActiva],
            [diaActivo]: {
              ...diaPrev,
              id: newDiaId,
              ejercicios: [...diaPrev.ejercicios, ejercicio],
            },
          },
        },
      }
    })
  }

  // ── Quitar ejercicio
  function handleEjercicioRemovido(id: string) {
    setRutina((r) => {
      if (!r) return r
      return {
        ...r,
        dias: {
          ...r.dias,
          [semanaActiva]: {
            ...r.dias[semanaActiva],
            [diaActivo]: {
              ...diaData,
              ejercicios: diaData.ejercicios.filter((e) => e.id !== id),
            },
          },
        },
      }
    })
  }

  // ── Actualizar ejercicio localmente
  function handleEjercicioActualizado(id: string, updates: Partial<EjercicioEnDia>) {
    setRutina((r) => {
      if (!r) return r
      return {
        ...r,
        dias: {
          ...r.dias,
          [semanaActiva]: {
            ...r.dias[semanaActiva],
            [diaActivo]: {
              ...diaData,
              ejercicios: diaData.ejercicios.map((e) =>
                e.id === id ? { ...e, ...updates } : e
              ),
            },
          },
        },
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header de rutina */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          {editandoNombre ? (
            <NombreEditor
              valor={rutina.nombre}
              onGuardar={handleGuardarNombreRutina}
              onCancelar={() => setEditandoNombre(false)}
            />
          ) : (
            <>
              <span className="font-semibold text-slate-900">{rutina.nombre}</span>
              <button
                onClick={() => setEditandoNombre(true)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Activa
          </span>
        </div>
      </div>

      {/* Selector de semanas con agrupación por mes */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-2">
        {rutina.semanas.map((sem, idx) => {
          const mes = getMes(sem)
          const prevMes = idx > 0 ? getMes(rutina.semanas[idx - 1]) : null
          const showMes = mes !== prevMes
          return (
            <Fragment key={sem}>
              {showMes && (
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${idx > 0 ? 'ml-2' : ''}`}>
                  Mes {mes}
                </span>
              )}
              <button
                onClick={() => setSemanaActiva(sem)}
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  semanaActiva === sem
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
                }`}
              >
                Sem {sem}
              </button>
            </Fragment>
          )
        })}
        <button
          onClick={handleAgregarSemana}
          className="ml-1 shrink-0 flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Sem
        </button>
      </div>

      {/* Tabs de días */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-4">
        {DIAS_SEMANA.map((dia) => {
          const diaInfo = rutina.dias[semanaActiva]?.[dia] ?? { ejercicios: [], esDescanso: false }
          const count = diaInfo.ejercicios.length
          const esDes = diaInfo.esDescanso
          return (
            <button
              key={dia}
              onClick={() => setDiaActivo(dia)}
              className={`relative flex shrink-0 flex-col items-center gap-0.5 px-4 py-3 text-sm font-medium transition-colors ${
                diaActivo === dia
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{DIAS_LABELS[dia]}</span>
              {esDes ? (
                <Moon className="h-3 w-3 text-slate-400" />
              ) : count > 0 ? (
                <span className={`rounded-full px-1.5 py-0 text-xs font-semibold ${
                  diaActivo === dia ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Contenido del día */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Controles del día */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editandoDia ? (
                <NombreEditor
                  valor={diaData.nombre}
                  placeholder="Nombre del día (ej: Pecho y Tríceps)"
                  onGuardar={handleGuardarNombreDia}
                  onCancelar={() => setEditandoDia(false)}
                />
              ) : (
                <>
                  <span className="text-sm font-semibold text-slate-700">
                    {diaData.nombre || DIAS_LABELS[diaActivo]}
                  </span>
                  {diaData.id && (
                    <button
                      onClick={() => setEditandoDia(true)}
                      className="rounded p-1 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Toggle descanso + copiar */}
            <div className="flex items-center gap-2">
              {/* Copiar día */}
              {diaData.id && diaData.ejercicios.length > 0 && !diaData.esDescanso && (
                <div className="relative">
                  <button
                    onClick={() => setCopiarAbierto((v) => !v)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </button>
                  {copiarAbierto && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                        Copiar a...
                      </p>
                      {DIAS_SEMANA.filter((d) => d !== diaActivo).map((d) => (
                        <button
                          key={d}
                          onClick={() => handleCopiarA(d)}
                          className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {DIAS_LABELS[d]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle descanso */}
              <button
                onClick={handleToggleDescanso}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  diaData.esDescanso
                    ? 'bg-slate-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                {diaData.esDescanso ? 'Descanso ✓' : 'Descanso'}
              </button>
            </div>
          </div>

          {/* Contenido: descanso o ejercicios */}
          {diaData.esDescanso ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
              <Moon className="h-10 w-10 text-slate-300" />
              <div>
                <p className="font-medium text-slate-600">Día de descanso</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  El alumno verá la encuesta de sueño pero no ejercicios.
                </p>
              </div>
              <button
                onClick={handleToggleDescanso}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Quitar descanso
              </button>
            </div>
          ) : diaData.ejercicios.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
              <Dumbbell className="h-10 w-10 text-slate-300" />
              <div>
                <p className="font-medium text-slate-600">Sin ejercicios</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Agregá ejercicios para el {DIAS_LABELS[diaActivo].toLowerCase()} — Semana {semanaActiva}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {diaData.ejercicios.map((ej) => (
                <EjercicioDiaRow
                  key={ej.id}
                  ejercicio={ej}
                  alumnoId={alumnoId}
                  onRemove={handleEjercicioRemovido}
                  onUpdate={handleEjercicioActualizado}
                />
              ))}
            </div>
          )}

          {/* Botón agregar (solo si no es descanso) */}
          {!diaData.esDescanso && (
            <button
              onClick={() => setAgregarOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
              Agregar ejercicio
            </button>
          )}
        </div>
      </div>

      {/* Modal agregar ejercicio */}
      <AgregarEjercicioModal
        open={agregarOpen}
        onClose={() => setAgregarOpen(false)}
        rutinaId={rutina.id}
        alumnoId={alumnoId}
        diaSemana={diaActivo}
        semanaNumero={semanaActiva}
        diaActual={diaData}
        ejerciciosLib={ejerciciosLib}
        onAgregado={handleEjercicioAgregado}
      />
    </div>
  )
}

// ── Editor inline de nombre ───────────────────────────────────────────────────

function NombreEditor({
  valor,
  placeholder,
  onGuardar,
  onCancelar,
}: {
  valor: string
  placeholder?: string
  onGuardar: (v: string) => void
  onCancelar: () => void
}) {
  const [draft, setDraft] = useState(valor)

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onGuardar(draft)
    if (e.key === 'Escape') onCancelar()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => onGuardar(draft)}
        placeholder={placeholder}
        className="rounded-lg border border-blue-400 px-3 py-1.5 text-sm font-semibold outline-none ring-2 ring-blue-500/20"
      />
      <button
        onClick={() => onGuardar(draft)}
        className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500 transition-colors"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}
