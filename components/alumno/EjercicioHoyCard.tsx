'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Heart, PlayCircle, Trash2 } from 'lucide-react'
import { grupoColor, rpeButtonColor, RPE_CONFIG } from '@/lib/utils'
import { eliminarProgreso } from '@/app/(alumno)/rutina/actions'
import { offlineWrite } from '@/lib/offline-write'
import { MODALIDADES, type Modalidad } from '@/lib/modalidades'
import { formatCardioPrescripcion } from '@/components/rutinas/CardioConfigForm'
import type { GrupoMuscular } from '@/lib/types/database'

export interface EjercicioHoyData {
  rutinaEjercicioId: string
  nombre: string
  grupos: GrupoMuscular[]
  video_url: string | null
  series: number
  repeticiones: string
  peso_objetivo: number | null
  descanso_segundos: number | null
  duracion_segundos: number | null
  notas: string | null
  rpe_objetivo: number | null
  modalidad: string
  agrupacion: string | null
  // Cardio
  tipo_cardio?: 'liss' | 'hiit' | 'tabata' | 'tempo' | null
  duracion_total_segundos?: number | null
  trabajo_segundos?: number | null
  descanso_intervalo_segundos?: number | null
  rondas?: number | null
  fc_objetivo_min?: number | null
  fc_objetivo_max?: number | null
  intensidad?: string | null
  metros_objetivo?: number | null
  ultimoPeso: number | null
  ultimasReps: string | null
  registroHoy: {
    series_completadas: number | null
    repeticiones_realizadas: string | null
    peso_utilizado: number | null
    pesos_por_serie?: (number | null)[] | null
    rpe: number | null
    tiempo_real_segundos?: number | null
    fc_promedio?: number | null
    distancia_metros?: number | null
    notas?: string | null
  } | null
}

/** Formatea segundos como "30s" o "2m 30s" o "5m" para mostrar al alumno */
export function formatDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos}s`
  const mins = Math.floor(segundos / 60)
  const restoSeg = segundos % 60
  if (restoSeg === 0) return `${mins} min`
  return `${mins}m ${restoSeg}s`
}

interface EjercicioHoyCardProps {
  ejercicio: EjercicioHoyData
  index: number
  fecha?: string
}

// ── Inicialización de arrays de pesos y reps por serie ────────────────────────

function initPesos(ejercicio: EjercicioHoyData): string[] {
  const n = ejercicio.series
  if (ejercicio.registroHoy?.pesos_por_serie?.length) {
    const arr = ejercicio.registroHoy.pesos_por_serie
    return Array(n).fill('').map((_, i) =>
      arr[i] != null ? String(arr[i]) : (ejercicio.peso_objetivo != null ? String(ejercicio.peso_objetivo) : '')
    )
  }
  const def = ejercicio.registroHoy?.peso_utilizado ?? ejercicio.peso_objetivo
  return Array(n).fill(def != null ? String(def) : '')
}

function initReps(ejercicio: EjercicioHoyData): string[] {
  const n = ejercicio.series
  const existing = ejercicio.registroHoy?.repeticiones_realizadas
  if (existing) {
    const arr = existing.split(',').map(s => s.trim())
    return Array(n).fill('').map((_, i) => arr[i] ?? arr[arr.length - 1] ?? ejercicio.repeticiones)
  }
  return Array(n).fill(ejercicio.repeticiones)
}

export function EjercicioHoyCard({ ejercicio, index, fecha }: EjercicioHoyCardProps) {
  const yaHecho = !!ejercicio.registroHoy
  const [isPending, startTransition] = useTransition()
  const [guardado, setGuardado] = useState(yaHecho)
  const [expandido, setExpandido] = useState(!yaHecho)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    series: ejercicio.registroHoy?.series_completadas ?? ejercicio.series,
    pesos: initPesos(ejercicio),
    repsArray: initReps(ejercicio),
    rpe: ejercicio.registroHoy?.rpe ?? '' as number | '',
    notas: ejercicio.registroHoy?.notas ?? '',
  })

  const esCardio = ejercicio.modalidad === 'cardio'

  // ── Form state específico para cardio
  // Tiempo sugerido = series * (trabajo + intervalo) — del nuevo modelo
  const seriesCardio = ejercicio.series ?? ejercicio.rondas ?? 1
  const tiempoSugerido = ejercicio.trabajo_segundos
    ? seriesCardio * (ejercicio.trabajo_segundos + (ejercicio.descanso_intervalo_segundos ?? 0))
    : ejercicio.duracion_total_segundos ?? null
  const [cardioForm, setCardioForm] = useState({
    tiempo_min: ejercicio.registroHoy?.tiempo_real_segundos != null
      ? String(Math.round(ejercicio.registroHoy.tiempo_real_segundos / 60))
      : (tiempoSugerido ? String(Math.round(tiempoSugerido / 60)) : ''),
    fc_promedio: ejercicio.registroHoy?.fc_promedio != null ? String(ejercicio.registroHoy.fc_promedio) : '',
    distancia_metros: ejercicio.registroHoy?.distancia_metros != null
      ? String(ejercicio.registroHoy.distancia_metros)
      : (ejercicio.metros_objetivo ? String(ejercicio.metros_objetivo) : ''),
  })

  // Sincronizar largo de arrays cuando cambia series
  const numSeries = Math.max(1, Math.min(10, Number(form.series) || 1))

  const pesosSync = form.pesos.length !== numSeries
    ? Array(numSeries).fill('').map((_, i) => form.pesos[i] ?? form.pesos[0] ?? '')
    : form.pesos

  const repsSync = form.repsArray.length !== numSeries
    ? Array(numSeries).fill('').map((_, i) => form.repsArray[i] ?? form.repsArray[0] ?? ejercicio.repeticiones)
    : form.repsArray

  function setPeso(i: number, val: string) {
    const next = [...pesosSync]
    next[i] = val
    setForm(p => ({ ...p, pesos: next }))
  }

  function setRep(i: number, val: string) {
    const next = [...repsSync]
    next[i] = val
    setForm(p => ({ ...p, repsArray: next }))
  }

  function fillAllPesos(val: string) {
    setForm(p => ({ ...p, pesos: Array(numSeries).fill(val) }))
  }

  function fillAllReps(val: string) {
    setForm(p => ({ ...p, repsArray: Array(numSeries).fill(val) }))
  }

  function handleEliminar() {
    if (!fecha) return
    startTransition(async () => {
      const result = await eliminarProgreso(ejercicio.rutinaEjercicioId, fecha)
      if (!result.error) {
        setGuardado(false)
        setExpandido(true)
        setForm(f => ({ ...f, rpe: '' }))
      }
    })
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const pesosNums = pesosSync.map(p => p !== '' ? Number(p) : null)
    const noNulls = pesosNums.filter(p => p !== null) as number[]
    const pesoUtilizado = noNulls.length > 0
      ? Math.round((noNulls.reduce((a, b) => a + b, 0) / noNulls.length) * 10) / 10
      : null

    // Reps: si todas iguales → valor único, si distintas → comma-separated
    const repeticionesRealizadas = repsSync.every(r => r === repsSync[0])
      ? (repsSync[0] || ejercicio.repeticiones)
      : repsSync.join(',')

    startTransition(async () => {
      const result = await offlineWrite('registrarProgreso', {
        rutinaEjercicioId: ejercicio.rutinaEjercicioId,
        seriesCompletadas: numSeries,
        repeticionesRealizadas,
        pesoUtilizado,
        pesos_por_serie: pesosNums,
        rpe: form.rpe !== '' ? Number(form.rpe) : null,
        notas: form.notas || null,
        fecha,
      })
      if (!result.ok) {
        setError(result.error ?? 'Error al guardar')
      } else {
        setGuardado(true)
        setExpandido(false)
        // Auto-iniciar el temporizador de descanso con lo que definió el profe
        if (ejercicio.descanso_segundos && ejercicio.descanso_segundos > 0) {
          window.dispatchEvent(new CustomEvent('iniciar-descanso', {
            detail: { segundos: ejercicio.descanso_segundos },
          }))
        }
      }
    })
  }

  // Border izquierdo según modalidad para identificar visualmente
  const modalidadBorder =
    ejercicio.modalidad === 'biserie' ? 'border-l-4 border-l-purple-400'
    : ejercicio.modalidad === 'superserie' ? 'border-l-4 border-l-fuchsia-400'
    : ejercicio.modalidad === 'triserie' ? 'border-l-4 border-l-indigo-400'
    : ejercicio.modalidad === 'drop_set' ? 'border-l-4 border-l-red-400'
    : ejercicio.modalidad === 'rest_pause' ? 'border-l-4 border-l-amber-400'
    : ejercicio.modalidad === 'piramidal' ? 'border-l-4 border-l-orange-400'
    : ejercicio.modalidad === 'isometrica' ? 'border-l-4 border-l-cyan-400'
    : ejercicio.modalidad === 'tempo' ? 'border-l-4 border-l-emerald-400'
    : ejercicio.modalidad === 'cardio' ? 'border-l-4 border-l-rose-400'
    : ''

  function handleGuardarCardio(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await offlineWrite('registrarProgreso', {
        rutinaEjercicioId: ejercicio.rutinaEjercicioId,
        seriesCompletadas: 1,
        repeticionesRealizadas: '—',
        pesoUtilizado: null,
        pesos_por_serie: [],
        rpe: form.rpe !== '' ? Number(form.rpe) : null,
        notas: form.notas || null,
        fecha,
        tiempo_real_segundos: cardioForm.tiempo_min ? Math.round(Number(cardioForm.tiempo_min) * 60) : null,
        fc_promedio: cardioForm.fc_promedio ? Number(cardioForm.fc_promedio) : null,
        distancia_metros: cardioForm.distancia_metros ? Number(cardioForm.distancia_metros) : null,
      })
      if (!result.ok) {
        setError(result.error ?? 'Error al guardar')
      } else {
        setGuardado(true)
        setExpandido(false)
      }
    })
  }

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${modalidadBorder} ${
      guardado ? 'ring-emerald-200' : 'ring-slate-100'
    }`}>
      {/* Header del ejercicio */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          guardado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {guardado ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">{ejercicio.nombre}</p>
            {ejercicio.video_url && (
              <a
                href={ejercicio.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-red-500 hover:text-red-600 transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {ejercicio.grupos.map((g) => (
              <span key={g.id} className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}>
                {g.nombre}
              </span>
            ))}
            {ejercicio.modalidad && ejercicio.modalidad !== 'normal' && MODALIDADES[ejercicio.modalidad as Modalidad] && (
              <span className={`flex items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold ${MODALIDADES[ejercicio.modalidad as Modalidad].color}`}>
                {MODALIDADES[ejercicio.modalidad as Modalidad].emoji}
                {MODALIDADES[ejercicio.modalidad as Modalidad].short}
                {ejercicio.agrupacion && <span className="ml-0.5 rounded bg-white/40 px-1">{ejercicio.agrupacion}</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Botón borrar registro — solo visible cuando está registrado y cerrado */}
          {guardado && !expandido && fecha && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEliminar() }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-slate-300 hover:text-red-400 transition-colors"
              title="Borrar registro"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-col items-end gap-1 text-right">
            {esCardio ? (
              <span className="text-xs font-semibold text-rose-600 max-w-[200px] leading-tight">
                {formatCardioPrescripcion(ejercicio) || 'Cardio'}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-700">
                {ejercicio.series}×{ejercicio.duracion_segundos
                  ? formatDuracion(ejercicio.duracion_segundos)
                  : ejercicio.repeticiones}
                {ejercicio.peso_objetivo ? ` · ${ejercicio.peso_objetivo}kg` : ''}
                {ejercicio.rpe_objetivo ? ` · RPE ${ejercicio.rpe_objetivo}` : ''}
              </span>
            )}
            {guardado && !expandido && (
              <span className="text-xs text-emerald-600 font-medium">Registrado ✓</span>
            )}
            {expandido ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {/* Panel expandido — cardio */}
      {expandido && esCardio && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Aviso prescripción cardio */}
          <div className="mb-4 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCardioPrescripcion(ejercicio) || 'Cardio'}
            </p>
            {ejercicio.notas && (
              <p className="mt-1 text-xs text-rose-700/80 italic">"{ejercicio.notas}"</p>
            )}
          </div>

          <form onSubmit={handleGuardarCardio} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">Tiempo (min)</label>
                <input
                  type="number"
                  min={1}
                  value={cardioForm.tiempo_min}
                  onChange={(e) => setCardioForm((p) => ({ ...p, tiempo_min: e.target.value }))}
                  placeholder="30"
                  className="w-full rounded-xl border border-slate-200 px-2 py-2.5 text-center text-base font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">FC prom (bpm)</label>
                <input
                  type="number"
                  min={40}
                  max={220}
                  value={cardioForm.fc_promedio}
                  onChange={(e) => setCardioForm((p) => ({ ...p, fc_promedio: e.target.value }))}
                  placeholder="140"
                  className="w-full rounded-xl border border-slate-200 px-2 py-2.5 text-center text-base font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">Distancia (m)</label>
                <input
                  type="number"
                  min={0}
                  value={cardioForm.distancia_metros}
                  onChange={(e) => setCardioForm((p) => ({ ...p, distancia_metros: e.target.value }))}
                  placeholder="—"
                  className="w-full rounded-xl border border-slate-200 px-2 py-2.5 text-center text-base font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* RPE */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  RPE percibido <span className="text-slate-400">· opcional</span>
                </label>
                {form.rpe !== '' && (
                  <span className="text-xs font-semibold text-slate-600">
                    {RPE_CONFIG[Number(form.rpe)]?.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rpe: p.rpe === n ? '' : n }))}
                    className={`rounded-lg py-2 text-sm font-bold transition-colors ${rpeButtonColor(n, form.rpe === n)}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              placeholder="Notas opcionales..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : guardado ? 'Actualizar cardio' : '✓ Registrar cardio'}
            </button>
          </form>
        </div>
      )}

      {/* Panel expandido — fuerza/normal */}
      {expandido && !esCardio && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {/* Aviso de modalidad si es especial */}
          {ejercicio.modalidad && ejercicio.modalidad !== 'normal' && MODALIDADES[ejercicio.modalidad as Modalidad] && (
            <div className={`mt-3 rounded-xl p-3 ${MODALIDADES[ejercicio.modalidad as Modalidad].color}`}>
              <p className="text-xs font-bold flex items-center gap-1">
                {MODALIDADES[ejercicio.modalidad as Modalidad].emoji}
                {MODALIDADES[ejercicio.modalidad as Modalidad].label}
                {ejercicio.agrupacion && <span className="ml-1 rounded bg-white/50 px-1.5 py-0.5">Grupo {ejercicio.agrupacion}</span>}
              </p>
              <p className="mt-1 text-xs opacity-80 leading-snug">
                {MODALIDADES[ejercicio.modalidad as Modalidad].descripcion}
              </p>
            </div>
          )}

          {/* Contexto */}
          <div className="mb-4 mt-3 flex flex-wrap gap-3">
            {ejercicio.ultimoPeso !== null && (
              <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-medium text-blue-700">
                  Última vez: {ejercicio.ultimoPeso}kg × {ejercicio.ultimasReps}
                </span>
              </div>
            )}
            {/* Descanso: oculto si es parte de biserie/superserie/triserie (se muestra a nivel grupo) */}
            {ejercicio.descanso_segundos && !['biserie', 'superserie', 'triserie'].includes(ejercicio.modalidad) && (
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  Descanso {ejercicio.descanso_segundos}s
                </span>
              </div>
            )}
            {ejercicio.rpe_objetivo && (
              <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5">
                <span className="text-xs font-medium text-orange-700">
                  RPE objetivo: {ejercicio.rpe_objetivo}/10
                </span>
              </div>
            )}
            {ejercicio.notas && (
              <p className="w-full text-xs text-slate-600 italic">"{ejercicio.notas}"</p>
            )}
          </div>

          <form onSubmit={handleGuardar} className="space-y-4">
            {/* Series */}
            <div className="flex flex-col gap-1">
              <label className="text-center text-xs font-medium text-slate-700">Series</label>
              <input
                type="number"
                min={1}
                value={form.series}
                onChange={(e) => setForm((p) => ({ ...p, series: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 px-2 py-3 text-center text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Reps por serie */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  {numSeries === 1 ? 'Repeticiones' : 'Reps por serie'}
                </label>
                {numSeries > 1 && repsSync[0] !== '' && (
                  <button
                    type="button"
                    onClick={() => fillAllReps(repsSync[0])}
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Igual en todas
                  </button>
                )}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(numSeries, 3)}, minmax(0, 1fr))` }}>
                {repsSync.map((r, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {numSeries > 1 && (
                      <span className="text-[10px] font-semibold text-slate-400">S{i + 1}</span>
                    )}
                    <input
                      type="text"
                      placeholder="—"
                      value={r}
                      onChange={(e) => setRep(i, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2 py-3 text-center text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pesos por serie */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  {numSeries === 1 ? 'Peso (kg)' : 'Peso por serie (kg)'}
                </label>
                {numSeries > 1 && pesosSync[0] !== '' && (
                  <button
                    type="button"
                    onClick={() => fillAllPesos(pesosSync[0])}
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Igual en todas
                  </button>
                )}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(numSeries, 3)}, minmax(0, 1fr))` }}>
                {pesosSync.map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {numSeries > 1 && (
                      <span className="text-[10px] font-semibold text-slate-400">S{i + 1}</span>
                    )}
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="—"
                      value={p}
                      onChange={(e) => setPeso(i, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2 py-3 text-center text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* RPE */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Esfuerzo percibido (RPE 1–10) <span className="text-slate-400">· opcional</span>
                </label>
                {form.rpe !== '' && (
                  <span className="text-xs font-semibold text-slate-600">
                    {RPE_CONFIG[Number(form.rpe)]?.label} — {RPE_CONFIG[Number(form.rpe)]?.desc}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rpe: p.rpe === n ? '' : n }))}
                    className={`rounded-lg py-2.5 text-sm font-bold transition-colors ${
                      rpeButtonColor(n, form.rpe === n)
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <input
              type="text"
              value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              placeholder="Notas opcionales..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : guardado ? 'Actualizar registro' : '✓ Registrar serie'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
