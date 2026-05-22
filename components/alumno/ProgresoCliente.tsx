'use client'

import { useState } from 'react'
import { TrendingUp, Dumbbell, ChevronDown, ChevronUp, Moon, Zap, Scale } from 'lucide-react'
import { grupoColor, DESCANSO_CONFIG, RPE_CONFIG } from '@/lib/utils'
import { PesoCard } from '@/components/alumno/PesoCard'
import type {
  DatosEstadisticas,
  PuntoTemporal,
  SesionHistorial,
  RegistroHistorial,
  RegistroBienestar,
  RegistroPeso,
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

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function MiniBarChart({
  puntos,
  campo,
  maxVal,
  colorFn,
}: {
  puntos: PuntoTemporal[]
  campo: 'descanso' | 'rpe'
  maxVal: number
  colorFn: (val: number) => string
}) {
  return (
    <div className="flex items-end gap-0.5 h-14">
      {puntos.map((p, i) => {
        const val = p[campo]
        const h = val !== null ? Math.round((val / maxVal) * 100) : 0
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            {val !== null && (
              <span className="text-[8px] font-bold text-slate-700 leading-none">{val}</span>
            )}
            <div
              className={`w-full rounded-t-sm transition-all ${
                val !== null ? colorFn(val) : 'bg-slate-100'
              }`}
              style={{ height: `${h}%`, minHeight: val !== null ? '3px' : '0' }}
            />
          </div>
        )
      })}
    </div>
  )
}

function XAxisLabels({ puntos }: { puntos: PuntoTemporal[] }) {
  const step = puntos.length > 10 ? 2 : 1
  return (
    <div className="flex gap-0.5 mt-1">
      {puntos.map((p, i) => (
        <div key={i} className="flex-1 text-center">
          {i % step === 0 && (
            <span className="text-[8px] text-slate-500">{p.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Stats Section ─────────────────────────────────────────────────────────────

type Periodo = 'diario' | 'semanal' | 'mensual'

function EstadisticasTab({ estadisticas }: { estadisticas: DatosEstadisticas }) {
  const [periodo, setPeriodo] = useState<Periodo>('diario')
  const puntos = estadisticas[periodo]

  const tieneDatos = puntos.some((p) => p.descanso !== null || p.rpe !== null)

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

      {!tieneDatos ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-slate-100">
          <TrendingUp className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">Sin datos en este período todavía.</p>
        </div>
      ) : (
        <>
          {/* RPE */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Zap className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Esfuerzo promedio (RPE)</p>
              <span className="ml-auto text-xs text-slate-400">escala 1–10</span>
            </div>
            <div className="px-4 py-3">
              <MiniBarChart
                puntos={puntos}
                campo="rpe"
                maxVal={10}
                colorFn={(v) =>
                  v <= 4 ? 'bg-lime-400' : v <= 6 ? 'bg-yellow-400' : v <= 8 ? 'bg-orange-400' : 'bg-red-500'
                }
              />
              <XAxisLabels puntos={puntos} />
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-slate-50 px-4 py-2.5">
              {[[1,'Fácil','bg-lime-400'],[5,'Moderado','bg-yellow-400'],[8,'Duro','bg-orange-400'],[10,'Máximo','bg-red-500']].map(([n, label, color]) => (
                <span key={n} className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${color}`}>
                  {n} – {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
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

function HistorialTab({ historial, totalRegistros }: { historial: SesionHistorial[]; totalRegistros: number }) {
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
                <RegistroRow key={r.id} registro={r} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RegistroRow({ registro: r }: { registro: RegistroHistorial }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
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
        {r.rpe !== null && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${rpeColor(r.rpe)}`}>
            RPE {r.rpe}
          </span>
        )}
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
  totalRegistros: number
}

export function ProgresoCliente({ estadisticas, historial, bienestar = [], pesos = [], pesoHoy, totalRegistros }: Props) {
  const [tab, setTab] = useState<'estadisticas' | 'sueno' | 'peso' | 'historial'>('estadisticas')

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

      {tab === 'estadisticas' && <EstadisticasTab estadisticas={estadisticas} />}
      {tab === 'sueno' && <SuenoTab bienestar={bienestar} />}
      {tab === 'peso' && <PesoTab pesos={pesos} pesoHoy={pesoHoy} />}
      {tab === 'historial' && <HistorialTab historial={historial} totalRegistros={totalRegistros} />}
    </div>
  )
}
