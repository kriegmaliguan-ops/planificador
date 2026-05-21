'use client'

import { useState } from 'react'
import { TrendingUp, Dumbbell, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'
import { grupoColor } from '@/lib/utils'
import type {
  SesionDia,
  ProgresionEjercicio,
  RegistroItem,
} from '@/app/(alumno)/historial/page'

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  const date = new Date(fecha + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatFechaCorta(fecha: string): string {
  const date = new Date(fecha + 'T00:00:00')
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function rpeColor(rpe: number): string {
  if (rpe <= 4) return 'bg-emerald-100 text-emerald-700'
  if (rpe <= 7) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  sesiones: SesionDia[]
  progresion: ProgresionEjercicio[]
  total: number
}

// ── Component ─────────────────────────────────────────────────────────────

export function HistorialCliente({ sesiones, progresion, total }: Props) {
  const [tab, setTab] = useState<'sesiones' | 'progreso'>('sesiones')
  const [sesionExpandida, setSesionExpandida] = useState<string | null>(
    sesiones[0]?.fecha ?? null
  )
  const [ejercicioId, setEjercicioId] = useState<string>(
    progresion[0]?.ejercicioId ?? ''
  )

  const ejercicioActual = progresion.find((p) => p.ejercicioId === ejercicioId)

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

      {/* Header */}
      <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Tu progreso
            </p>
            <h1 className="mt-1 text-2xl font-bold">Historial</h1>
          </div>
          <TrendingUp className="h-6 w-6 text-slate-500" />
        </div>
        {total > 0 && (
          <p className="mt-2 text-sm text-slate-400">
            {total} registro{total !== 1 ? 's' : ''} ·{' '}
            {sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      {/* Empty state */}
      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
          <Dumbbell className="h-12 w-12 text-slate-300" />
          <div>
            <p className="text-lg font-bold text-slate-900">Sin registros aún</p>
            <p className="mt-1 text-sm text-slate-500">
              Completá tu primera sesión y tu historial aparecerá aquí.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['sesiones', 'progreso'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'sesiones' ? 'Sesiones' : 'Progreso'}
              </button>
            ))}
          </div>

          {/* ── Sesiones ── */}
          {tab === 'sesiones' && (
            <div className="space-y-3">
              {sesiones.map((sesion) => (
                <SesionCard
                  key={sesion.fecha}
                  sesion={sesion}
                  expandida={sesionExpandida === sesion.fecha}
                  onToggle={() =>
                    setSesionExpandida((s) =>
                      s === sesion.fecha ? null : sesion.fecha
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* ── Progreso ── */}
          {tab === 'progreso' && (
            <div className="space-y-4">
              {/* Selector de ejercicio */}
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Elegí un ejercicio
                </p>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {progresion.map((p) => (
                    <button
                      key={p.ejercicioId}
                      onClick={() => setEjercicioId(p.ejercicioId)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                        ejercicioId === p.ejercicioId
                          ? 'bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          ejercicioId === p.ejercicioId
                            ? 'text-blue-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {p.ejercicioNombre}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.historial.length} reg.
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gráfico + tabla del ejercicio seleccionado */}
              {ejercicioActual && (
                <ProgresoCard ejercicio={ejercicioActual} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── SesionCard ────────────────────────────────────────────────────────────

function SesionCard({
  sesion,
  expandida,
  onToggle,
}: {
  sesion: SesionDia
  expandida: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
        expandida ? 'ring-blue-200' : 'ring-slate-100'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="font-semibold text-slate-900 capitalize">
            {formatFecha(sesion.fecha)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {sesion.registros.length} ejercicio
            {sesion.registros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini dots */}
          <div className="flex items-center gap-1">
            {sesion.registros.slice(0, 5).map((r) => (
              <div key={r.id} className="h-2 w-2 rounded-full bg-blue-400" />
            ))}
            {sesion.registros.length > 5 && (
              <span className="text-xs text-slate-400">
                +{sesion.registros.length - 5}
              </span>
            )}
          </div>
          {expandida ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Exercise rows */}
      {expandida && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {sesion.registros.map((r) => (
            <EjercicioRow key={r.id} registro={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── EjercicioRow ─────────────────────────────────────────────────────────

function EjercicioRow({ registro: r }: { registro: RegistroItem }) {
  const hitTarget =
    r.pesoObjetivo !== null &&
    r.pesoUtilizado !== null &&
    r.pesoUtilizado >= r.pesoObjetivo

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{r.ejercicioNombre}</p>
          {r.grupos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {r.grupos.map((g) => (
                <span
                  key={g.id}
                  className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}
                >
                  {g.nombre}
                </span>
              ))}
            </div>
          )}
        </div>
        {r.rpe !== null && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${rpeColor(r.rpe)}`}
          >
            RPE {r.rpe}
          </span>
        )}
      </div>

      {/* Rendimiento */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-800">
          {r.seriesCompletadas ?? r.seriesObjetivo} ×{' '}
          {r.repeticionesRealizadas ?? r.repsObjetivo}
          {r.pesoUtilizado !== null ? ` @ ${r.pesoUtilizado} kg` : ''}
        </span>
        {hitTarget && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />
            objetivo
          </span>
        )}
      </div>

      {r.notas && (
        <p className="mt-1 text-xs text-slate-400 italic">"{r.notas}"</p>
      )}
    </div>
  )
}

// ── ProgresoCard ──────────────────────────────────────────────────────────

function ProgresoCard({ ejercicio }: { ejercicio: ProgresionEjercicio }) {
  const conPeso = ejercicio.historial.filter((h) => h.peso !== null)
  const ultimosMax = [...ejercicio.historial].reverse().slice(0, 8).reverse()

  // Progresión total de peso
  const pesoInicial = conPeso[0]?.peso ?? null
  const pesoActual = conPeso[conPeso.length - 1]?.peso ?? null
  const delta =
    pesoInicial !== null && pesoActual !== null
      ? +(pesoActual - pesoInicial).toFixed(1)
      : null

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-900">{ejercicio.ejercicioNombre}</p>
        {ejercicio.grupos.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {ejercicio.grupos.map((g) => (
              <span
                key={g.id}
                className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}
              >
                {g.nombre}
              </span>
            ))}
          </div>
        )}
        {delta !== null && delta !== 0 && (
          <p
            className={`mt-2 text-sm font-semibold ${
              delta > 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} kg desde el primer registro
          </p>
        )}
      </div>

      {/* Gráfico de barras */}
      {conPeso.length >= 2 ? (
        <div className="px-4 pt-4 pb-2">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Peso utilizado (kg)
          </p>
          <WeightChart historial={conPeso.slice(-10)} />
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-400">
          Necesitás al menos 2 registros con peso para ver el gráfico.
        </p>
      )}

      {/* Tabla de últimos registros */}
      <div className="border-t border-slate-100">
        <p className="border-b border-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Últimos registros
        </p>
        <div className="divide-y divide-slate-50">
          {ultimosMax.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-xs text-slate-500 capitalize">
                {formatFechaCorta(h.fecha)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {h.series ?? '?'} × {h.reps ?? '?'}
                  {h.peso !== null ? ` @ ${h.peso} kg` : ''}
                </span>
                {h.rpe !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${rpeColor(h.rpe)}`}
                  >
                    {h.rpe}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── WeightChart ───────────────────────────────────────────────────────────

const MAX_BAR_PX = 60

function WeightChart({
  historial,
}: {
  historial: Array<{ fecha: string; peso: number | null }>
}) {
  const pesos = historial.map((h) => h.peso!)
  const maxPeso = Math.max(...pesos)
  const minPeso = Math.min(...pesos)
  const range = maxPeso - minPeso || 1

  return (
    <div className="space-y-1">
      {/* Bars */}
      <div className="flex items-end gap-1.5" style={{ height: `${MAX_BAR_PX + 22}px` }}>
        {historial.map((h, i) => {
          const barH =
            range === 0
              ? MAX_BAR_PX * 0.5
              : Math.round(((h.peso! - minPeso) / range) * MAX_BAR_PX * 0.7 + MAX_BAR_PX * 0.3)

          const isLast = i === historial.length - 1
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-0.5"
            >
              <span
                className={`text-[9px] font-bold leading-none ${
                  isLast ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {h.peso}
              </span>
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isLast ? 'bg-blue-500' : 'bg-blue-200'
                }`}
                style={{ height: `${barH}px` }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis dates */}
      <div className="flex gap-1.5">
        {historial.map((h, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-slate-300">
              {formatFechaCorta(h.fecha)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
