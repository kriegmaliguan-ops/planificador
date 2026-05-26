'use client'

import { useState, useTransition } from 'react'
import { TrendingUp, Dumbbell, ChevronDown, ChevronUp, Moon, Zap, Scale, Pencil, Trash2, Check, X } from 'lucide-react'
import { grupoColor, DESCANSO_CONFIG, RPE_CONFIG, rpeButtonColor } from '@/lib/utils'
import { eliminarRegistroProgreso, actualizarRegistroProgreso } from '@/app/(alumno)/rutina/actions'
import { PesoCard } from '@/components/alumno/PesoCard'
import type {
  DatosEstadisticas,
  PuntoTemporal,
  SesionHistorial,
  RegistroHistorial,
  RegistroBienestar,
  RegistroPeso,
  RpeEjercicio,
} from '@/app/(alumno)/progreso/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatFechaCorta(fecha: string): string {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function rpeColor(rpe: number): string {
  if (rpe <= 4) return 'bg-lime-100 text-lime-700'
  if (rpe <= 6) return 'bg-yellow-100 text-yellow-700'
  if (rpe <= 8) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

// ── RPE Bar Chart ─────────────────────────────────────────────────────────────

const CHART_H = 140

function rpeBarColor(rpe: number): string {
  if (rpe <= 3) return 'bg-lime-400'
  if (rpe <= 5) return 'bg-yellow-400'
  if (rpe <= 7) return 'bg-orange-400'
  return 'bg-red-500'
}

function RPEBarChart({ puntos }: { puntos: PuntoTemporal[] }) {
  const ticks = [2, 4, 6, 8, 10]
  return (
    <div>
      <div className="flex">
        {/* Y-axis */}
        <div
          className="flex flex-col-reverse justify-between w-5 pr-1.5 shrink-0"
          style={{ height: CHART_H }}
        >
          {ticks.map((n) => (
            <span key={n} className="block text-right text-[9px] text-slate-400 leading-none">{n}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1 border-l border-slate-100" style={{ height: CHART_H }}>
          {/* Grid lines */}
          {ticks.map((n) => (
            <div
              key={n}
              className="absolute left-0 right-0 border-t border-slate-100"
              style={{ top: `${((10 - n) / 10) * 100}%` }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-px px-1">
            {puntos.map((p, i) => {
              const hasRPE = p.rpe !== null
              const pct = hasRPE ? (p.rpe! / 10) * 100 : 0
              return (
                <div key={i} className="relative flex flex-1 items-end h-full">
                  {/* Bar */}
                  <div
                    className={`w-full transition-all ${
                      !hasRPE
                        ? p.esHoy ? 'bg-blue-100 rounded-sm' : 'bg-slate-100 rounded-sm'
                        : `rounded-t-sm ${rpeBarColor(p.rpe!)}`
                    }${hasRPE && p.esHoy ? ' ring-2 ring-blue-400 ring-offset-[1px]' : ''}`}
                    style={{ height: hasRPE ? `${pct}%` : '3px', minHeight: hasRPE ? '4px' : '3px' }}
                  />
                  {/* Value label above bar */}
                  {hasRPE && (
                    <span
                      className="absolute left-0 right-0 text-center text-[8px] font-bold leading-none text-slate-700 pointer-events-none"
                      style={{ bottom: `calc(${pct}% + 3px)` }}
                    >
                      {p.rpe}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1.5 pl-5">
        {puntos.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            <span className={`block text-[9px] leading-none ${
              p.esHoy ? 'font-bold text-blue-600'
              : p.sesiones === 0 ? 'text-slate-300'
              : 'text-slate-500'
            }`}>
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── RPE por Ejercicio (Diario) ────────────────────────────────────────────────

function RPEEjerciciosChart({ ejercicios }: { ejercicios: RpeEjercicio[] }) {
  const ticks = [2, 4, 6, 8, 10]
  return (
    <div>
      <div className="flex">
        {/* Y-axis */}
        <div
          className="flex flex-col-reverse justify-between w-5 pr-1.5 shrink-0"
          style={{ height: CHART_H }}
        >
          {ticks.map((n) => (
            <span key={n} className="block text-right text-[9px] text-slate-400 leading-none">{n}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1 border-l border-slate-100" style={{ height: CHART_H }}>
          {/* Grid lines */}
          {ticks.map((n) => (
            <div
              key={n}
              className="absolute left-0 right-0 border-t border-slate-100"
              style={{ top: `${((10 - n) / 10) * 100}%` }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-1 px-1">
            {ejercicios.map((ej, i) => {
              const pct = (ej.rpe / 10) * 100
              return (
                <div key={i} className="relative flex flex-1 items-end h-full">
                  <div
                    className={`w-full rounded-t-sm transition-all ${rpeBarColor(ej.rpe)}`}
                    style={{ height: `${pct}%`, minHeight: '4px' }}
                  />
                  <span
                    className="absolute left-0 right-0 text-center text-[8px] font-bold leading-none text-slate-700 pointer-events-none"
                    style={{ bottom: `calc(${pct}% + 3px)` }}
                  >
                    {ej.rpe}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis: nombre abreviado del ejercicio */}
      <div className="flex mt-1.5 pl-5">
        {ejercicios.map((ej, i) => (
          <div key={i} className="flex-1 text-center overflow-hidden px-0.5">
            <span className="block text-[9px] leading-none text-slate-500 truncate" title={ej.nombre}>
              {ej.nombre.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats Section ─────────────────────────────────────────────────────────────

type Periodo = 'diario' | 'semanal' | 'mensual'

const PERIODO_LABELS: Record<Periodo, string> = {
  diario: 'Hoy',
  semanal: 'Esta semana',
  mensual: 'Este mes',
}

function EstadisticasTab({ estadisticas, rpeHoy = [] }: { estadisticas: DatosEstadisticas; rpeHoy?: RpeEjercicio[] }) {
  const [periodo, setPeriodo] = useState<Periodo>('semanal')
  const puntos = estadisticas[periodo]

  const tieneDatos = periodo === 'diario'
    ? rpeHoy.length > 0
    : puntos.some((p) => p.rpe !== null)

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['diario', 'semanal', 'mensual'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
              periodo === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Zap className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Esfuerzo (RPE)</p>
          <span className="ml-auto text-xs text-slate-400">{PERIODO_LABELS[periodo]}</span>
        </div>

        {tieneDatos ? (
          <div className="px-4 pt-4 pb-3">
            {periodo === 'diario'
              ? <RPEEjerciciosChart ejercicios={rpeHoy} />
              : <RPEBarChart puntos={puntos} />
            }
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Zap className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">
              {periodo === 'diario'
                ? 'Sin ejercicios con RPE registrados hoy.'
                : 'Sin entrenamientos registrados en este período.'
              }
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-50 px-4 py-2.5">
          {([['≤3','Fácil','bg-lime-400'],['≤5','Moderado','bg-yellow-400'],['≤7','Duro','bg-orange-400'],['8+','Máximo','bg-red-500']] as const).map(([n, label, color]) => (
            <span key={n} className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${color}`}>
              {n} – {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sueño Tab ─────────────────────────────────────────────────────────────────

function SuenoTab({ bienestar }: { bienestar: RegistroBienestar[] }) {
  if (bienestar.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-100">
        <Moon className="h-12 w-12 text-slate-200" />
        <p className="text-sm text-slate-400">Aún no hay registros de sueño.</p>
        <p className="text-xs text-slate-400">Completá la encuesta de sueño en la sección Rutina.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Moon className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">Historial de sueño</p>
        <span className="ml-auto text-xs text-slate-400">{bienestar.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="divide-y divide-slate-50">
        {bienestar.map((b) => {
          const cfg = DESCANSO_CONFIG[b.descanso]
          return (
            <div key={b.fecha} className="flex items-center gap-3 px-4 py-3">
              {/* Fecha */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 capitalize">
                  {formatFechaCorta(b.fecha)}
                </p>
                {b.notas && (
                  <p className="mt-0.5 text-xs text-slate-500 italic truncate">"{b.notas}"</p>
                )}
              </div>
              {/* Badge calidad */}
              {cfg && (
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${cfg.color}`}>
                  {b.descanso} – {cfg.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Peso Tab ──────────────────────────────────────────────────────────────────

function PesoTab({
  pesos,
  pesoHoy,
}: {
  pesos: RegistroPeso[]
  pesoHoy?: { peso_kg: number; notas: string | null } | null
}) {
  // Ordenados de más reciente a más antiguo
  const sorted = [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))

  const pesoActual = sorted[0]?.peso_kg ?? null
  const pesoInicial = sorted.length > 1 ? sorted[sorted.length - 1].peso_kg : null
  const variacion =
    pesoActual !== null && pesoInicial !== null
      ? Math.round((pesoActual - pesoInicial) * 10) / 10
      : null

  return (
    <div className="space-y-4">
      {/* Card de registro — solo visible para el alumno (pesoHoy no es undefined) */}
      {pesoHoy !== undefined && (
        <PesoCard registroHoy={pesoHoy} />
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-100">
          <Scale className="h-12 w-12 text-slate-200" />
          <p className="text-sm text-slate-400">Aún no hay registros de peso.</p>
          <p className="text-xs text-slate-400">Registrá tu primer peso arriba.</p>
        </div>
      ) : (
        <>
          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white px-3 py-3 text-center ring-1 ring-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Actual</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {pesoActual} <span className="text-xs font-normal text-slate-400">kg</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3 text-center ring-1 ring-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Inicial</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {pesoInicial ?? pesoActual} <span className="text-xs font-normal text-slate-400">kg</span>
              </p>
            </div>
            <div className={`rounded-2xl px-3 py-3 text-center ring-1 ${
              variacion === null ? 'bg-white ring-slate-100'
              : variacion > 0 ? 'bg-orange-50 ring-orange-200'
              : variacion < 0 ? 'bg-emerald-50 ring-emerald-200'
              : 'bg-slate-50 ring-slate-100'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cambio</p>
              <p className={`mt-1 text-lg font-bold ${
                variacion === null ? 'text-slate-400'
                : variacion > 0 ? 'text-orange-600'
                : variacion < 0 ? 'text-emerald-600'
                : 'text-slate-500'
              }`}>
                {variacion === null ? '—'
                  : `${variacion > 0 ? '+' : ''}${variacion}`}{' '}
                {variacion !== null && <span className="text-xs font-normal opacity-70">kg</span>}
              </p>
            </div>
          </div>

          {/* Historial */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Scale className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Historial de peso</p>
              <span className="ml-auto text-xs text-slate-400">{sorted.length} registros</span>
            </div>
            <div className="divide-y divide-slate-50">
              {sorted.map((p, i) => {
                const prev = sorted[i + 1]
                const delta = prev
                  ? Math.round((p.peso_kg - prev.peso_kg) * 10) / 10
                  : null
                return (
                  <div key={p.fecha} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 capitalize">
                        {formatFechaCorta(p.fecha)}
                      </p>
                      {p.notas && (
                        <p className="mt-0.5 text-xs text-slate-500 italic truncate">"{p.notas}"</p>
                      )}
                    </div>
                    {delta !== null && (
                      <span className={`text-xs font-semibold shrink-0 ${
                        delta > 0 ? 'text-orange-500'
                        : delta < 0 ? 'text-emerald-500'
                        : 'text-slate-400'
                      }`}>
                        {delta > 0 ? '↑' : delta < 0 ? '↓' : '='}{Math.abs(delta) > 0 ? ` ${Math.abs(delta).toFixed(1)}` : ''}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold text-slate-900">
                      {p.peso_kg} kg
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Historial Tab ─────────────────────────────────────────────────────────────

function HistorialTab({
  historial,
  totalRegistros,
  editable,
  onDelete,
  onUpdate,
}: {
  historial: SesionHistorial[]
  totalRegistros: number
  editable?: boolean
  onDelete?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<RegistroHistorial>) => void
}) {
  const [expandida, setExpandida] = useState<string | null>(historial[0]?.fecha ?? null)

  if (totalRegistros === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-100">
        <Dumbbell className="h-12 w-12 text-slate-200" />
        <p className="text-sm text-slate-400">Completá tu primera sesión para ver el historial.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {historial.map((sesion) => (
        <div
          key={sesion.fecha}
          className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
            expandida === sesion.fecha ? 'ring-blue-200' : 'ring-slate-100'
          }`}
        >
          <button
            onClick={() => setExpandida((s) => s === sesion.fecha ? null : sesion.fecha)}
            className="flex w-full items-center justify-between px-4 py-4 text-left"
          >
            <div>
              <p className="font-semibold text-slate-900 capitalize">{formatFecha(sesion.fecha)}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {sesion.registros.length} ejercicio{sesion.registros.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {sesion.registros.slice(0, 5).map((r) => (
                  <div key={r.id} className="h-2 w-2 rounded-full bg-blue-400" />
                ))}
              </div>
              {expandida === sesion.fecha
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </div>
          </button>

          {expandida === sesion.fecha && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {sesion.registros.map((r) => (
                <RegistroRow
                  key={r.id}
                  registro={r}
                  editable={editable}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RegistroRow({
  registro: r,
  editable,
  onDelete,
  onUpdate,
}: {
  registro: RegistroHistorial
  editable?: boolean
  onDelete?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<RegistroHistorial>) => void
}) {
  const [editando, setEditando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()
  const [form, setForm] = useState({
    series: String(r.series ?? 1),
    reps: r.reps ?? '',
    peso: r.peso != null ? String(r.peso) : '',
    rpe: (r.rpe ?? '') as number | '',
    notas: r.notas ?? '',
  })

  function handleGuardar() {
    const pesoNum = form.peso !== '' ? Number(form.peso) : null
    const updates: Partial<RegistroHistorial> = {
      series: Number(form.series) || 1,
      reps: form.reps,
      peso: pesoNum,
      rpe: form.rpe !== '' ? Number(form.rpe) : null,
      notas: form.notas || null,
    }
    onUpdate?.(r.id, updates)
    setEditando(false)
    startTransition(async () => {
      await actualizarRegistroProgreso(r.id, {
        series_completadas: Number(form.series) || 1,
        repeticiones_realizadas: form.reps,
        peso_utilizado: pesoNum,
        rpe: form.rpe !== '' ? Number(form.rpe) : null,
        notas: form.notas || null,
      })
    })
  }

  function handleDelete() {
    onDelete?.(r.id)
    startTransition(async () => {
      await eliminarRegistroProgreso(r.id)
    })
  }

  // ── Vista de edición ──────────────────────────────────────────────────────
  if (editando) {
    return (
      <div className="px-4 py-3 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 truncate">{r.ejercicioNombre}</p>
          <button onClick={() => setEditando(false)} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Series, Reps, Peso */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Series</label>
            <input
              type="number" min={1}
              value={form.series}
              onChange={(e) => setForm((p) => ({ ...p, series: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Reps</label>
            <input
              type="text"
              value={form.reps}
              onChange={(e) => setForm((p) => ({ ...p, reps: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Peso (kg)</label>
            <input
              type="number" min={0} step={0.5}
              value={form.peso}
              onChange={(e) => setForm((p) => ({ ...p, peso: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="—"
            />
          </div>
        </div>

        {/* RPE */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1.5">
            RPE <span className="text-slate-400">· opcional</span>
            {form.rpe !== '' && (
              <span className="ml-2 font-semibold text-slate-600">
                {RPE_CONFIG[Number(form.rpe)]?.label}
              </span>
            )}
          </label>
          <div className="grid grid-cols-5 gap-1">
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button
                key={n} type="button"
                onClick={() => setForm((p) => ({ ...p, rpe: p.rpe === n ? '' : n }))}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${rpeButtonColor(n, form.rpe === n)}`}
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
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={handleGuardar}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
          >
            <Check className="h-4 w-4" />
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // ── Vista normal ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 truncate">{r.ejercicioNombre}</p>
          {r.grupos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {r.grupos.map((g) => (
                <span key={g.id} className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}>
                  {g.nombre}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {r.rpe !== null && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${rpeColor(r.rpe)}`}>
              RPE {r.rpe}
            </span>
          )}
          {editable && (
            <>
              <button
                onClick={() => { setEditando(true); setConfirmDelete(false) }}
                className="rounded-lg p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-0.5 rounded-lg border border-red-200 bg-red-50 px-1.5 py-1">
                  <span className="text-[10px] font-medium text-red-600">¿Borrar?</span>
                  <button onClick={handleDelete} className="rounded px-1 text-[10px] font-bold text-red-600 hover:text-red-700">Sí</button>
                  <button onClick={() => setConfirmDelete(false)} className="rounded px-0.5 text-[10px] text-slate-400 hover:text-slate-600">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                  title="Borrar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-sm font-semibold text-slate-800">
        {r.series ?? '?'} × {r.reps ?? '?'}
        {r.peso !== null ? ` @ ${r.peso} kg` : ''}
      </p>
      {r.notas && <p className="mt-0.5 text-xs text-slate-600 italic">"{r.notas}"</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  estadisticas: DatosEstadisticas
  historial: SesionHistorial[]
  bienestar?: RegistroBienestar[]
  pesos?: RegistroPeso[]
  /** undefined = vista del profe (sin card de registro); null = alumno sin registro hoy */
  pesoHoy?: { peso_kg: number; notas: string | null } | null
  rpeHoy?: RpeEjercicio[]
  totalRegistros: number
  /** true = alumno (puede editar/borrar registros), false/undefined = profe (solo lectura) */
  editable?: boolean
}

export function ProgresoCliente({ estadisticas, historial, bienestar = [], pesos = [], pesoHoy, rpeHoy = [], totalRegistros, editable }: Props) {
  const [tab, setTab] = useState<'estadisticas' | 'sueno' | 'peso' | 'historial'>('estadisticas')
  const [localHistorial, setLocalHistorial] = useState<SesionHistorial[]>(historial)

  function handleDeleteRegistro(id: string) {
    setLocalHistorial((prev) =>
      prev
        .map((s) => ({ ...s, registros: s.registros.filter((r) => r.id !== id) }))
        .filter((s) => s.registros.length > 0)
    )
  }

  function handleUpdateRegistro(id: string, updates: Partial<RegistroHistorial>) {
    setLocalHistorial((prev) =>
      prev.map((s) => ({
        ...s,
        registros: s.registros.map((r) => r.id === id ? { ...r, ...updates } : r),
      }))
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

      {/* Header */}
      <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tu avance</p>
            <h1 className="mt-1 text-2xl font-bold">Progreso</h1>
          </div>
          <TrendingUp className="h-6 w-6 text-slate-500" />
        </div>
        {totalRegistros > 0 && (
          <p className="mt-2 text-sm text-slate-400">
            {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''} · {historial.length} sesión{historial.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
        {([
          ['estadisticas', 'RPE'],
          ['sueno', 'Sueño'],
          ['peso', 'Peso'],
          ['historial', 'Historial'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'estadisticas' && <EstadisticasTab estadisticas={estadisticas} rpeHoy={rpeHoy} />}
      {tab === 'sueno' && <SuenoTab bienestar={bienestar} />}
      {tab === 'peso' && <PesoTab pesos={pesos} pesoHoy={pesoHoy} />}
      {tab === 'historial' && (
        <HistorialTab
          historial={localHistorial}
          totalRegistros={localHistorial.reduce((acc, s) => acc + s.registros.length, 0)}
          editable={editable}
          onDelete={handleDeleteRegistro}
          onUpdate={handleUpdateRegistro}
        />
      )}
    </div>
  )
}
