'use client'

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, Dumbbell, Moon, Copy, CopyCheck, CalendarDays, X, Trash2, MessageCircle, Send, Loader2, FileText, Flame, Clock, PlayCircle, Layers, Save, Download } from 'lucide-react'
import { DIAS_SEMANA, DIAS_LABELS, getWeekDates } from '@/lib/utils'
import {
  crearRutina,
  actualizarNombreRutina,
  actualizarFechaInicio,
  actualizarNombreDia,
  toggleDiaDescanso,
  copiarDia,
  copiarSemana,
  eliminarSemana,
  reordenarEjercicios,
  enviarMensajeAlumno,
  agruparEjercicios,
  desagruparEjercicios,
} from '@/app/(profe)/rutinas/[alumnoId]/actions'
import { crearRutinaDesdePlantilla } from '@/app/(profe)/plantillas/actions'
import { asignarCalentamientoADia } from '@/app/(profe)/calentamientos/actions'
import { guardarDiaComoBloque, aplicarBloqueADia } from '@/app/(profe)/bloques/actions'
import { EjercicioDiaRow } from './EjercicioDiaRow'
import { AgregarEjercicioModal } from './AgregarEjercicioModal'
import { DiaEjerciciosList } from './DiaEjerciciosList'
import { MODALIDADES } from '@/lib/modalidades'
import type { DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'
import type { RutinaData, EstadoDia, EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface PlantillaResumen {
  id: string
  nombre: string
}

export interface CalentamientoLib {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number | null
  video_url: string | null
}

export interface BloqueResumen {
  id: string
  nombre: string
  cantEjercicios: number
}

interface RutinaBuilderProps {
  alumnoId: string
  alumnoNombre: string
  rutinaInicial: RutinaData | null
  ejerciciosLib: EjercicioItem[]
  templateMode?: boolean
  plantillasDisponibles?: PlantillaResumen[]
  calentamientosDisponibles?: CalentamientoLib[]
  bloquesDisponibles?: BloqueResumen[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMes(semana: number): number {
  return Math.ceil(semana / 4)
}

function initWeekDias(): Record<DiaSemana, EstadoDia> {
  const d = {} as Record<DiaSemana, EstadoDia>
  for (const dia of DIAS_SEMANA) {
    d[dia] = { id: null, nombre: '', esDescanso: false, calentamientoId: null, ejercicios: [] }
  }
  return d
}

// ── Crear rutina ──────────────────────────────────────────────────────────────

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getProxLunes(): string {
  const d = new Date()
  const day = d.getDay() // 0=Dom, 1=Lun, ...6=Sab
  const daysToAdd = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysToAdd)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CrearRutinaForm({
  alumnoId,
  alumnoNombre,
  plantillasDisponibles,
  onCreada,
}: {
  alumnoId: string
  alumnoNombre: string
  plantillasDisponibles: PlantillaResumen[]
  onCreada: (rutina: RutinaData) => void
}) {
  const [nombre, setNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState<string>(getTodayLocal)
  const [mensaje, setMensaje] = useState('')
  const [plantillaId, setPlantillaId] = useState<string>('')  // '' = desde cero
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setError(null)
    startTransition(async () => {
      if (plantillaId) {
        // Clonar desde plantilla
        const result = await crearRutinaDesdePlantilla({
          plantillaId,
          alumnoId,
          nombre: nombre.trim(),
          fechaInicio: fechaInicio || null,
          mensajeProfe: mensaje.trim() || null,
        })
        if (result.error) { setError(result.error); return }
        // La rutina viene con todos los días y ejercicios — re-fetch full
        router.refresh()
        return
      }

      const result = await crearRutina(alumnoId, nombre.trim(), fechaInicio || null, mensaje.trim() || null)
      if (result.error) { setError(result.error); return }

      onCreada({
        id: result.id!,
        nombre: nombre.trim(),
        activa: true,
        fecha_inicio: fechaInicio || null,
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
          {/* Selector de plantilla (opcional) */}
          {plantillasDisponibles.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Empezar desde plantilla <span className="text-xs font-normal text-slate-400">(opcional)</span>
                </span>
              </label>
              <select
                value={plantillaId}
                onChange={(e) => setPlantillaId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">— Crear desde cero —</option>
                {plantillasDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {plantillaId && (
                <p className="text-xs text-violet-600">
                  ✨ Se va a clonar la plantilla con todos sus días y ejercicios.
                </p>
              )}
            </div>
          )}

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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  Inicio — Semana 1
                </span>
              </label>
              <button
                type="button"
                onClick={() => setFechaInicio(getProxLunes())}
                className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Próximo lunes →
              </button>
            </div>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-slate-400">
              El alumno verá la rutina a partir de esta fecha.
            </p>
          </div>

          {/* Mensaje opcional */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                Mensaje para el alumno <span className="text-xs font-normal text-slate-400">(opcional)</span>
              </span>
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ej: Arrancamos con un mesociclo de fuerza. Enfocate en la técnica del peso muerto esta semana."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
            <p className="text-xs text-slate-400">
              Si lo dejás vacío, le llega un aviso estándar.
            </p>
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

// ── Selector de calentamiento por día ─────────────────────────────────────────

function CalentamientoSelector({
  diaId,
  calentamientoId,
  calentamientos,
  alumnoId,
  onChange,
}: {
  diaId: string
  calentamientoId: string | null
  calentamientos: CalentamientoLib[]
  alumnoId: string
  onChange: (id: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()
  const cal = calentamientos.find((c) => c.id === calentamientoId) ?? null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value || null
    onChange(newId)
    startTransition(async () => {
      await asignarCalentamientoADia({
        diaId,
        calentamientoId: newId,
        alumnoId: alumnoId || diaId,
      })
    })
  }

  return (
    <div className="mb-3 rounded-2xl border border-orange-200 bg-orange-50/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-semibold text-slate-700">Calentamiento</span>
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />}
      </div>

      {calentamientos.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Todavía no hay calentamientos. Agregalos desde{' '}
          <a href="/calentamientos" className="text-blue-600 underline">/calentamientos</a>.
        </p>
      ) : (
        <>
          <select
            value={calentamientoId ?? ''}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">— Sin calentamiento —</option>
            {calentamientos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.duracion_minutos ? ` (${c.duracion_minutos} min)` : ''}
              </option>
            ))}
          </select>

          {cal && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
              {cal.duracion_minutos != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {cal.duracion_minutos} min
                </span>
              )}
              {cal.video_url && (
                <a
                  href={cal.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-500"
                >
                  <PlayCircle className="h-3 w-3" />
                  Ver video
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Botón enviar mensaje al alumno ────────────────────────────────────────────

function EnviarMensajeBtn({ alumnoId, alumnoNombre }: { alumnoId: string; alumnoNombre: string }) {
  const [open, setOpen] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [isPending, startTransition] = useTransition()
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleEnviar() {
    if (!mensaje.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await enviarMensajeAlumno(alumnoId, mensaje.trim())
      if (result.error) { setError(result.error); return }
      setEnviado(true)
      setMensaje('')
      setTimeout(() => { setOpen(false); setEnviado(false) }, 1500)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-1 flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        title="Enviar mensaje al alumno"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Mensaje
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mensaje para {alumnoNombre}</h3>
                <p className="text-xs text-slate-500">Le va a llegar como notificación.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              autoFocus
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ej: Esta semana enfocate en la técnica del peso muerto. Subí el peso solo si la forma se mantiene."
              rows={4}
              maxLength={500}
              disabled={isPending || enviado}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none disabled:bg-slate-50"
            />
            <div className="mt-1 flex justify-between">
              <span className="text-[10px] text-slate-400">{mensaje.length}/500</span>
            </div>

            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                disabled={isPending || !mensaje.trim() || enviado}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : enviado ? (
                  <>
                    <Check className="h-4 w-4" />
                    Enviado
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Builder principal ─────────────────────────────────────────────────────────

export function RutinaBuilder({
  alumnoId,
  alumnoNombre,
  rutinaInicial,
  ejerciciosLib,
  templateMode = false,
  plantillasDisponibles = [],
  calentamientosDisponibles = [],
  bloquesDisponibles = [],
}: RutinaBuilderProps) {
  const [rutina, setRutina] = useState<RutinaData | null>(rutinaInicial)
  const [semanaActiva, setSemanaActiva] = useState<number>(rutinaInicial?.semanas[0] ?? 1)
  const [diaActivo, setDiaActivo] = useState<DiaSemana>('lunes')
  const [agregarOpen, setAgregarOpen] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [editandoDia, setEditandoDia] = useState(false)
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [fechaTemp, setFechaTemp] = useState(rutina?.fecha_inicio ?? '')
  const [copiarAbierto, setCopiarAbierto] = useState(false)
  const [copiarSemanaAbierto, setCopiarSemanaAbierto] = useState(false)
  const [guardarBloqueOpen, setGuardarBloqueOpen] = useState(false)
  const [cargarBloqueOpen, setCargarBloqueOpen] = useState(false)
  const [aplicarPlantillaOpen, setAplicarPlantillaOpen] = useState(false)
  // Configuración del modal cuando se abre desde un botón de modalidad o slot de draft
  const [agregarConfig, setAgregarConfig] = useState<{
    modalidad: string
    agrupacion: string | null
    maxSeleccionados?: number
    titulo: string
  } | null>(null)
  // Drafts de grupos (biserie/superserie/triserie) creados localmente, esperando que se llenen
  const [drafts, setDrafts] = useState<Array<{
    id: string
    modalidad: 'biserie' | 'superserie' | 'triserie'
    agrupacion: string  // A, B, C...
    semana: number
    dia: DiaSemana
    slotsTotal: number
  }>>([])
  const [confirmarBorrarSemana, setConfirmarBorrarSemana] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  if (!rutina) {
    return (
      <CrearRutinaForm
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        plantillasDisponibles={plantillasDisponibles}
        onCreada={(r) => { setRutina(r); setSemanaActiva(1) }}
      />
    )
  }

  const diaData = rutina.dias[semanaActiva]?.[diaActivo] ?? { id: null, nombre: '', esDescanso: false, ejercicios: [] }

  // ── Actualizar fecha de inicio
  function handleGuardarFecha() {
    setEditandoFecha(false)
    const valor = fechaTemp.trim() || null
    if (valor === (rutina!.fecha_inicio ?? '')) return
    startTransition(async () => {
      await actualizarFechaInicio(rutina!.id, valor, alumnoId)
      setRutina((r) => r ? { ...r, fecha_inicio: valor } : r)
    })
  }

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

  // ── Eliminar semana
  function handleEliminarSemana(sem: number) {
    setConfirmarBorrarSemana(null)
    const siguienteSem = rutina!.semanas.find((s) => s !== sem) ?? 1
    startTransition(async () => {
      await eliminarSemana(rutina!.id, sem, alumnoId)
      setRutina((r) => {
        if (!r) return r
        const nuevasSemanas = r.semanas.filter((s) => s !== sem)
        const nuevosDias = { ...r.dias }
        delete nuevosDias[sem]
        return { ...r, semanas: nuevasSemanas, dias: nuevosDias }
      })
      setSemanaActiva(siguienteSem)
    })
  }

  // ── Copiar semana
  function handleCopiarSemana(destino: number) {
    setCopiarSemanaAbierto(false)
    startTransition(async () => {
      const result = await copiarSemana(rutina!.id, semanaActiva, destino, alumnoId)
      if (!result.error) {
        // Si la semana destino no existía en el estado local, agregarla
        setRutina((r) => {
          if (!r) return r
          const semanasSet = new Set([...r.semanas, destino])
          return {
            ...r,
            semanas: Array.from(semanasSet).sort((a, b) => a - b),
            dias: {
              ...r.dias,
              [destino]: {
                ...r.dias[destino],
                // Los días se recargarán en el próximo render del server
              },
            },
          }
        })
        // Recargar la página para ver los cambios en la semana destino
        window.location.reload()
      }
    })
  }

  // ── Agregar ejercicios (puede ser uno o varios)
  function handleEjercicioAgregado(newDiaId: string, ejercicios: EjercicioEnDia[]) {
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
              ejercicios: [...diaPrev.ejercicios, ...ejercicios],
            },
          },
        },
      }
    })
  }

  // ── Crear un draft group (biserie/superserie/triserie vacío) ────────────────
  function handleCrearDraft(modalidad: 'biserie' | 'superserie' | 'triserie') {
    // Letras de agrupación ya usadas en el día (incluyendo ejercicios reales + drafts)
    const ejs = rutina?.dias[semanaActiva]?.[diaActivo]?.ejercicios ?? []
    const usadas = new Set<string>()
    for (const e of ejs) if (e.agrupacion) usadas.add(e.agrupacion.toUpperCase())
    for (const d of drafts) {
      if (d.semana === semanaActiva && d.dia === diaActivo) usadas.add(d.agrupacion)
    }
    let letra = 'A'
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(65 + i)
      if (!usadas.has(c)) { letra = c; break }
    }
    const slotsTotal = modalidad === 'triserie' ? 3 : 2
    setDrafts((p) => [...p, {
      id: `draft-${Date.now()}`,
      modalidad,
      agrupacion: letra,
      semana: semanaActiva,
      dia: diaActivo,
      slotsTotal,
    }])
  }

  // ── Mover ejercicio arriba o abajo
  function handleMoverEjercicio(id: string, direccion: 'up' | 'down') {
    const ejercicios = rutina!.dias[semanaActiva][diaActivo]?.ejercicios ?? []
    const idx = ejercicios.findIndex((e) => e.id === id)
    if (idx < 0) return
    const nuevoIdx = direccion === 'up' ? idx - 1 : idx + 1
    if (nuevoIdx < 0 || nuevoIdx >= ejercicios.length) return

    const nuevos = [...ejercicios]
    ;[nuevos[idx], nuevos[nuevoIdx]] = [nuevos[nuevoIdx], nuevos[idx]]

    setRutina((r) => {
      if (!r) return r
      return {
        ...r,
        dias: {
          ...r.dias,
          [semanaActiva]: {
            ...r.dias[semanaActiva],
            [diaActivo]: { ...r.dias[semanaActiva][diaActivo]!, ejercicios: nuevos },
          },
        },
      }
    })

    startTransition(async () => {
      await reordenarEjercicios(nuevos.map((e) => e.id), alumnoId)
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
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
          {templateMode ? (
            <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              Plantilla
            </span>
          ) : (
            <>
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Activa
              </span>
              <EnviarMensajeBtn alumnoId={alumnoId} alumnoNombre={alumnoNombre} />
              {plantillasDisponibles.length > 0 && (
                <button
                  onClick={() => setAplicarPlantillaOpen(true)}
                  className="ml-1 flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                  title="Reemplazar con plantilla"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Plantilla
                </button>
              )}
            </>
          )}
        </div>

        {/* Fecha de inicio editable — no aplica en modo plantilla */}
        {!templateMode && <div className="flex items-center gap-1.5">
          {editandoFecha ? (
            <>
              <input
                type="date"
                autoFocus
                value={fechaTemp}
                onChange={(e) => setFechaTemp(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGuardarFecha(); if (e.key === 'Escape') setEditandoFecha(false) }}
                className="rounded-lg border border-blue-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button onClick={handleGuardarFecha} className="rounded p-1 text-emerald-600 hover:text-emerald-700">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditandoFecha(false)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => { setFechaTemp(rutina.fecha_inicio ?? ''); setEditandoFecha(true) }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              title="Editar fecha de inicio"
            >
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              {rutina.fecha_inicio
                ? new Date(rutina.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
                : <span className="text-slate-400">Sin fecha de inicio</span>
              }
              <Pencil className="h-3 w-3 text-slate-400" />
            </button>
          )}
        </div>}
      </div>

      {/* Selector de semanas con agrupación por mes */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-2">
        {rutina.semanas.map((sem, idx) => {
          const mes = getMes(sem)
          const prevMes = idx > 0 ? getMes(rutina.semanas[idx - 1]) : null
          const showMes = mes !== prevMes
          const isActive = semanaActiva === sem
          const canDelete = rutina.semanas.length > 1
          return (
            <Fragment key={sem}>
              {showMes && (
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${idx > 0 ? 'ml-2' : ''}`}>
                  Mes {mes}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => { setSemanaActiva(sem); setConfirmarBorrarSemana(null) }}
                  className={`flex flex-col items-center rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
                  }`}
                >
                  <span>Sem {sem}</span>
                  {rutina.fecha_inicio && (
                    <span className={`text-[9px] font-normal leading-tight ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}>
                      {getWeekDates(rutina.fecha_inicio, sem)}
                    </span>
                  )}
                </button>

                {/* Borrar semana — solo en semana activa cuando hay más de una */}
                {isActive && canDelete && (
                  confirmarBorrarSemana === sem ? (
                    <div className="flex items-center gap-0.5 rounded-lg border border-red-200 bg-red-50 px-1.5 py-1">
                      <span className="text-[10px] font-medium text-red-600">¿Borrar?</span>
                      <button
                        onClick={() => handleEliminarSemana(sem)}
                        className="rounded px-1 text-[10px] font-bold text-red-600 hover:text-red-700"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmarBorrarSemana(null)}
                        className="rounded px-0.5 text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmarBorrarSemana(sem)}
                      className="rounded p-1 text-slate-300 hover:text-red-400 transition-colors"
                      title={`Borrar Sem ${sem}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
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

        {/* Copiar semana activa */}
        <div className="relative ml-1">
          <button
            onClick={() => setCopiarSemanaAbierto((v) => !v)}
            title={`Copiar Sem ${semanaActiva}`}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <CopyCheck className="h-3 w-3" />
            Copiar Sem {semanaActiva}
          </button>
          {copiarSemanaAbierto && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                Copiar a...
              </p>
              {rutina.semanas.filter((s) => s !== semanaActiva).map((s) => (
                <button
                  key={s}
                  onClick={() => handleCopiarSemana(s)}
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  Sem {s}
                </button>
              ))}
              <button
                onClick={() => handleCopiarSemana(Math.max(...rutina.semanas) + 1)}
                className="flex w-full items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Nueva semana
              </button>
            </div>
          )}
        </div>
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
        <div className="mx-auto max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl space-y-4 px-2 md:px-4 lg:px-6">

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

          {/* Selector de calentamiento (solo si no es descanso) */}
          {!diaData.esDescanso && diaData.id && (
            <CalentamientoSelector
              diaId={diaData.id}
              calentamientoId={diaData.calentamientoId}
              calentamientos={calentamientosDisponibles}
              alumnoId={alumnoId}
              onChange={(id) => {
                setRutina((prev) => {
                  if (!prev) return prev
                  const dias = { ...prev.dias }
                  const week = { ...dias[semanaActiva] }
                  week[diaActivo] = { ...week[diaActivo], calentamientoId: id }
                  dias[semanaActiva] = week
                  return { ...prev, dias }
                })
              }}
            />
          )}

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
          ) : diaData.ejercicios.length === 0 && drafts.filter((d) => d.semana === semanaActiva && d.dia === diaActivo).length === 0 ? (
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
            <DiaEjerciciosList
              ejercicios={diaData.ejercicios}
              diaId={diaData.id}
              alumnoId={alumnoId}
              drafts={drafts.filter((d) => d.semana === semanaActiva && d.dia === diaActivo)}
              onMoveUp={(id) => handleMoverEjercicio(id, 'up')}
              onMoveDown={(id) => handleMoverEjercicio(id, 'down')}
              onRemove={handleEjercicioRemovido}
              onUpdate={handleEjercicioActualizado}
              onDesagrupar={(agrupacion, diaId) => {
                startTransition(async () => {
                  await desagruparEjercicios(agrupacion, diaId, alumnoId)
                  window.location.reload()
                })
              }}
              onLlenarSlot={(modalidad, agrupacion) => {
                const info = MODALIDADES[modalidad as keyof typeof MODALIDADES]
                setAgregarConfig({
                  modalidad,
                  agrupacion,
                  maxSeleccionados: 1,
                  titulo: `Agregar a ${info?.label ?? modalidad} ${agrupacion}`,
                })
                setAgregarOpen(true)
              }}
              onCancelarDraft={(draftId) => setDrafts((p) => p.filter((d) => d.id !== draftId))}
            />
          )}

          {/* Botones agregar / bloques (solo si no es descanso) */}
          {!diaData.esDescanso && (
            <div className="mt-3 space-y-3">
              {/* Botón principal: Agregar ejercicio normal */}
              <button
                onClick={() => {
                  setAgregarConfig({ modalidad: 'normal', agrupacion: null, titulo: 'Agregar ejercicio' })
                  setAgregarOpen(true)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Agregar ejercicio
              </button>

              {/* Tipos especiales (modalidades de 1 ejercicio) */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Tipos especiales
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['drop_set','rest_pause','piramidal','isometrica','tempo'] as const).map((m) => {
                    const info = MODALIDADES[m]
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setAgregarConfig({
                            modalidad: m,
                            agrupacion: null,
                            titulo: `Agregar ejercicio (${info.label})`,
                          })
                          setAgregarOpen(true)
                        }}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${info.color} hover:opacity-80`}
                      >
                        {info.emoji} {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Series encadenadas (crean grupos vacíos) */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Series encadenadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(['biserie','superserie','triserie'] as const).map((m) => {
                    const info = MODALIDADES[m]
                    return (
                      <button
                        key={m}
                        onClick={() => handleCrearDraft(m)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${info.color} hover:opacity-80`}
                      >
                        🔗 Crear {info.label.toLowerCase()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Operaciones del día */}
              <div className="flex flex-wrap gap-2 pt-1">
                {bloquesDisponibles.length > 0 && (
                  <button
                    onClick={() => setCargarBloqueOpen(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Cargar bloque
                  </button>
                )}
                {diaData.id && diaData.ejercicios.length > 0 && (
                  <button
                    onClick={() => setGuardarBloqueOpen(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar día como bloque
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar ejercicio */}
      <AgregarEjercicioModal
        open={agregarOpen}
        onClose={() => { setAgregarOpen(false); setAgregarConfig(null) }}
        rutinaId={rutina.id}
        alumnoId={alumnoId}
        diaSemana={diaActivo}
        semanaNumero={semanaActiva}
        diaActual={diaData}
        ejerciciosLib={ejerciciosLib}
        onAgregado={(diaId, agregados) => {
          handleEjercicioAgregado(diaId, agregados)
          // Si veníamos de un slot de draft, removemos el draft cuando ya tiene todos sus ejercicios
          if (agregarConfig?.agrupacion && agregarConfig.maxSeleccionados === 1) {
            // Solo cerrar agregarConfig; el draft se elimina automáticamente cuando todos los slots se llenan
            // (DiaEjerciciosList renderiza slots vacíos solo si hay menos ejercicios que slotsTotal)
            // Si llenó el último slot, el draft sale del state al refetcheo de la DB
            setDrafts((p) => {
              const draftIdx = p.findIndex(
                (d) => d.agrupacion === agregarConfig.agrupacion &&
                  d.semana === semanaActiva && d.dia === diaActivo
              )
              if (draftIdx === -1) return p
              const draft = p[draftIdx]
              // Cuántos ejercicios reales hay ya con esa agrupación
              const realesConEsaAgrup = (rutina?.dias[semanaActiva]?.[diaActivo]?.ejercicios ?? [])
                .filter((e) => e.agrupacion === draft.agrupacion).length
              // Después de este agregado (1 más), ¿el draft está lleno?
              if (realesConEsaAgrup + 1 >= draft.slotsTotal) {
                return p.filter((_, i) => i !== draftIdx)
              }
              return p
            })
          }
          setAgregarConfig(null)
        }}
        modalidadPre={agregarConfig?.modalidad ?? 'normal'}
        agrupacionPre={agregarConfig?.agrupacion ?? null}
        maxSeleccionados={agregarConfig?.maxSeleccionados}
        tituloPersonalizado={agregarConfig?.titulo}
      />

      {/* Modal: Guardar día como bloque */}
      {guardarBloqueOpen && diaData.id && (
        <GuardarComoBloqueModal
          diaId={diaData.id}
          onClose={() => setGuardarBloqueOpen(false)}
          onGuardado={() => { setGuardarBloqueOpen(false); router.refresh() }}
        />
      )}

      {/* Modal: Cargar bloque al día */}
      {cargarBloqueOpen && (
        <CargarBloqueModal
          rutinaId={rutina.id}
          diaSemana={diaActivo}
          semanaNumero={semanaActiva}
          alumnoId={alumnoId}
          bloques={bloquesDisponibles}
          onClose={() => setCargarBloqueOpen(false)}
          onAplicado={() => { setCargarBloqueOpen(false); window.location.reload() }}
        />
      )}

      {/* Modal AgruparEjerciciosModal eliminado: el flujo nuevo usa drafts con slots vacíos */}

      {/* Modal: Aplicar plantilla (reemplazar rutina) */}
      {aplicarPlantillaOpen && !templateMode && (
        <AplicarPlantillaModal
          plantillas={plantillasDisponibles}
          alumnoId={alumnoId}
          alumnoNombre={alumnoNombre}
          onClose={() => setAplicarPlantillaOpen(false)}
          onAplicada={() => { setAplicarPlantillaOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── Modal: guardar día como bloque ────────────────────────────────────────────

function GuardarComoBloqueModal({
  diaId, onClose, onGuardado,
}: {
  diaId: string
  onClose: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await guardarDiaComoBloque({
        diaId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
      })
      if (result.error) { setError(result.error); return }
      onGuardado()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Save className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Guardar día como bloque</h3>
          </div>
          <button onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Vas a guardar este día como un bloque reutilizable. Podrás aplicarlo a otros días con un click.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej: Pecho y tríceps"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Descripción opcional"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !nombre.trim()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: cargar bloque a un día ─────────────────────────────────────────────

function CargarBloqueModal({
  rutinaId, diaSemana, semanaNumero, alumnoId, bloques, onClose, onAplicado,
}: {
  rutinaId: string
  diaSemana: DiaSemana
  semanaNumero: number
  alumnoId: string
  bloques: BloqueResumen[]
  onClose: () => void
  onAplicado: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [modo, setModo] = useState<'append' | 'replace'>('append')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const result = await aplicarBloqueADia({
        bloqueId: selectedId,
        rutinaId,
        diaSemana,
        semanaNumero,
        alumnoId,
        modo,
      })
      if (result.error) { setError(result.error); return }
      onAplicado()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Download className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Cargar bloque</h3>
          </div>
          <button onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Elegí un bloque</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">— Seleccionar bloque —</option>
              {bloques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre} ({b.cantEjercicios} ejercicio{b.cantEjercicios === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">¿Cómo aplicar?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModo('append')}
                className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  modo === 'append' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                Agregar al día
                <p className="mt-0.5 text-[10px] font-normal opacity-70">Suma los ejercicios al final</p>
              </button>
              <button
                type="button"
                onClick={() => setModo('replace')}
                className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  modo === 'replace' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                Reemplazar
                <p className="mt-0.5 text-[10px] font-normal opacity-70">Borra y pone solo este bloque</p>
              </button>
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isPending} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !selectedId} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: aplicar plantilla a la rutina ──────────────────────────────────────

function AplicarPlantillaModal({
  plantillas, alumnoId, alumnoNombre, onClose, onAplicada,
}: {
  plantillas: PlantillaResumen[]
  alumnoId: string
  alumnoNombre: string
  onClose: () => void
  onAplicada: () => void
}) {
  const [plantillaId, setPlantillaId] = useState<string>('')
  const [nombre, setNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plantillaId || !nombre.trim() || success || isPending) return
    setError(null)
    startTransition(async () => {
      const result = await crearRutinaDesdePlantilla({
        plantillaId,
        alumnoId,
        nombre: nombre.trim(),
        fechaInicio: fechaInicio || null,
        mensajeProfe: null,
      })
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      // Mostrar feedback 1.5s antes de cerrar y refrescar
      setTimeout(() => onAplicada(), 1500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Aplicar plantilla a {alumnoNombre}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Se va a crear una rutina nueva desde la plantilla. La rutina actual queda inactiva (su historial se mantiene).
            </p>
          </div>
          <button onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plantilla</label>
            <select
              value={plantillaId}
              onChange={(e) => {
                setPlantillaId(e.target.value)
                const p = plantillas.find((x) => x.id === e.target.value)
                if (p && !nombre) setNombre(p.nombre)
              }}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">— Seleccionar plantilla —</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la nueva rutina</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Hipertrofia — Marzo"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              ¡Plantilla aplicada! Recargando la rutina...
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isPending || success} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || success || !plantillaId || !nombre.trim()} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${success ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {success ? <Check className="h-4 w-4" /> : null}
              {success ? '¡Aplicada!' : isPending ? 'Aplicando...' : 'Aplicar plantilla'}
            </button>
          </div>
        </form>
      </div>
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
