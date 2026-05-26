'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, PlayCircle, Trash2 } from 'lucide-react'
import { grupoColor, rpeButtonColor, RPE_CONFIG } from '@/lib/utils'
import { registrarProgreso, eliminarProgreso } from '@/app/(alumno)/rutina/actions'
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
  notas: string | null
  ultimoPeso: number | null
  ultimasReps: string | null
  registroHoy: {
    series_completadas: number | null
    repeticiones_realizadas: string | null
    peso_utilizado: number | null
    pesos_por_serie?: (number | null)[] | null
    rpe: number | null
  } | null
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
    notas: '',
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
      const result = await registrarProgreso({
        rutinaEjercicioId: ejercicio.rutinaEjercicioId,
        seriesCompletadas: numSeries,
        repeticionesRealizadas,
        pesoUtilizado,
        pesos_por_serie: pesosNums,
        rpe: form.rpe !== '' ? Number(form.rpe) : null,
        notas: form.notas || null,
        fecha,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setGuardado(true)
        setExpandido(false)
      }
    })
  }

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
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
          {ejercicio.grupos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {ejercicio.grupos.map((g) => (
                <span key={g.id} className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}>
                  {g.nombre}
                </span>
              ))}
            </div>
          )}
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
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-slate-700">
              {ejercicio.series}×{ejercicio.repeticiones}
              {ejercicio.peso_objetivo ? ` · ${ejercicio.peso_objetivo}kg` : ''}
            </span>
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

      {/* Panel expandido */}
      {expandido && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {/* Contexto */}
          <div className="mb-4 mt-3 flex flex-wrap gap-3">
            {ejercicio.ultimoPeso !== null && (
              <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-medium text-blue-700">
                  Última vez: {ejercicio.ultimoPeso}kg × {ejercicio.ultimasReps}
                </span>
              </div>
            )}
            {ejercicio.descanso_segundos && (
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  Descanso {ejercicio.descanso_segundos}s
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
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(numSeries, 4)}, minmax(0, 1fr))` }}>
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
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(numSeries, 4)}, minmax(0, 1fr))` }}>
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
