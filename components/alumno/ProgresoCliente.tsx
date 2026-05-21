'use client'

import { useState } from 'react'
import { TrendingUp, Dumbbell, ChevronDown, ChevronUp, Moon, Zap } from 'lucide-react'
import { grupoColor, DESCANSO_CONFIG, RPE_CONFIG } from '@/lib/utils'
import type {
  DatosEstadisticas,
  PuntoTemporal,
  SesionHistorial,
  RegistroHistorial,
} from '@/app/(alumno)/progreso/page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
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
  // Show every Nth label to avoid crowding
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
          {/* Sueño */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Moon className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Calidad de sueño</p>
              <span className="ml-auto text-xs text-slate-400">escala 1–7</span>
            </div>
            <div className="px-4 py-3">
              <MiniBarChart
                puntos={puntos}
                campo="descanso"
                maxVal={7}
                colorFn={(v) => DESCANSO_CONFIG[Math.round(v)]?.color.split(' ')[0] ?? 'bg-slate-200'}
              />
              <XAxisLabels puntos={puntos} />
            </div>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-50 px-4 py-2.5">
              {[1,4,7].map((n) => (
                <span key={n} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DESCANSO_CONFIG[n].color}`}>
                  {n} – {DESCANSO_CONFIG[n].label}
                </span>
              ))}
            </div>
          </div>

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
  totalRegistros: number
}

export function ProgresoCliente({ estadisticas, historial, totalRegistros }: Props) {
  const [tab, setTab] = useState<'estadisticas' | 'historial'>('estadisticas')

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
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab('estadisticas')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'estadisticas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Estadísticas
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Historial
        </button>
      </div>

      {tab === 'estadisticas'
        ? <EstadisticasTab estadisticas={estadisticas} />
        : <HistorialTab historial={historial} totalRegistros={totalRegistros} />
      }
    </div>
  )
}
