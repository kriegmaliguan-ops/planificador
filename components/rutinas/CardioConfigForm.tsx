'use client'

import { TIPOS_CARDIO, type TipoCardio } from '@/lib/modalidades'

export interface CardioConfig {
  tipo_cardio: TipoCardio
  duracion_total_segundos: number | null
  trabajo_segundos: number | null
  descanso_intervalo_segundos: number | null
  rondas: number | null
  fc_objetivo_min: number | null
  fc_objetivo_max: number | null
}

export const CARDIO_DEFAULT: CardioConfig = {
  tipo_cardio: 'liss',
  duracion_total_segundos: 1800, // 30 min
  trabajo_segundos: null,
  descanso_intervalo_segundos: null,
  rondas: null,
  fc_objetivo_min: 130,
  fc_objetivo_max: 150,
}

interface Props {
  value: CardioConfig
  onChange: (next: CardioConfig) => void
}

export function CardioConfigForm({ value, onChange }: Props) {
  const info = TIPOS_CARDIO[value.tipo_cardio]

  function setTipo(t: TipoCardio) {
    // Presets por tipo
    if (t === 'liss') {
      onChange({ ...value, tipo_cardio: t, duracion_total_segundos: value.duracion_total_segundos ?? 1800, trabajo_segundos: null, descanso_intervalo_segundos: null, rondas: null })
    } else if (t === 'hiit') {
      onChange({ ...value, tipo_cardio: t, duracion_total_segundos: null, trabajo_segundos: value.trabajo_segundos ?? 30, descanso_intervalo_segundos: value.descanso_intervalo_segundos ?? 60, rondas: value.rondas ?? 10 })
    } else if (t === 'tabata') {
      // Preset fijo 20/10 x8
      onChange({ ...value, tipo_cardio: t, duracion_total_segundos: 240, trabajo_segundos: 20, descanso_intervalo_segundos: 10, rondas: 8 })
    } else if (t === 'tempo') {
      onChange({ ...value, tipo_cardio: t, duracion_total_segundos: null, trabajo_segundos: value.trabajo_segundos ?? 300, descanso_intervalo_segundos: value.descanso_intervalo_segundos ?? 120, rondas: value.rondas ?? 3 })
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">🫀 Configuración cardio</p>

      {/* Selector de tipo */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(TIPOS_CARDIO) as TipoCardio[]).map((t) => {
          const active = value.tipo_cardio === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100'
              }`}
            >
              {TIPOS_CARDIO[t].label}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-rose-700/80">{info.descripcion}</p>

      {/* Duración total (LISS) */}
      {info.pideDuracionTotal && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs text-slate-600">Duración total</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={value.duracion_total_segundos ? Math.round(value.duracion_total_segundos / 60) : ''}
                onChange={(e) => onChange({ ...value, duracion_total_segundos: e.target.value ? Number(e.target.value) * 60 : null })}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                placeholder="30"
              />
              <span className="text-xs text-slate-500">min</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabata preview */}
      {value.tipo_cardio === 'tabata' && (
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-rose-200">
          <p className="text-xs text-slate-600">
            <strong>Preset Tabata:</strong> 8 rondas × (20s trabajo + 10s descanso) · Total 4 min
          </p>
        </div>
      )}

      {/* Intervalos (HIIT/Tempo) */}
      {info.pideIntervalos && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1 text-xs text-slate-600">Trabajo (s)</label>
            <input
              type="number"
              min={1}
              value={value.trabajo_segundos ?? ''}
              onChange={(e) => onChange({ ...value, trabajo_segundos: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              placeholder="30"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-slate-600">Descanso (s)</label>
            <input
              type="number"
              min={0}
              value={value.descanso_intervalo_segundos ?? ''}
              onChange={(e) => onChange({ ...value, descanso_intervalo_segundos: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-slate-600">Rondas</label>
            <input
              type="number"
              min={1}
              value={value.rondas ?? ''}
              onChange={(e) => onChange({ ...value, rondas: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              placeholder="10"
            />
          </div>
        </div>
      )}

      {/* FC objetivo */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1 text-xs text-slate-600">FC mínima (bpm)</label>
          <input
            type="number"
            min={40}
            max={220}
            value={value.fc_objetivo_min ?? ''}
            onChange={(e) => onChange({ ...value, fc_objetivo_min: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            placeholder="130"
          />
        </div>
        <div>
          <label className="block mb-1 text-xs text-slate-600">FC máxima (bpm)</label>
          <input
            type="number"
            min={40}
            max={220}
            value={value.fc_objetivo_max ?? ''}
            onChange={(e) => onChange({ ...value, fc_objetivo_max: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            placeholder="150"
          />
        </div>
      </div>
    </div>
  )
}

/** Formatea la prescripción cardio en texto legible para el alumno (modelo nuevo). */
export function formatCardioPrescripcion(c: {
  series?: number | null
  trabajo_segundos?: number | null
  descanso_intervalo_segundos?: number | null
  intensidad?: string | null
  metros_objetivo?: number | null
  // Legacy (compat)
  tipo_cardio?: string | null
  duracion_total_segundos?: number | null
  rondas?: number | null
  fc_objetivo_min?: number | null
  fc_objetivo_max?: number | null
}): string {
  const parts: string[] = []
  const series = c.series ?? c.rondas ?? null

  function fmtSeg(s: number): string {
    if (s >= 60 && s % 60 === 0) return `${s / 60} min`
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${s}s`
  }

  // Nuevo modelo: series + tiempo (+ intervalo opcional)
  if (c.trabajo_segundos) {
    if (series && series > 1) {
      const intervalo = c.descanso_intervalo_segundos
        ? ` + ${fmtSeg(c.descanso_intervalo_segundos)} descanso`
        : ''
      parts.push(`${series} × ${fmtSeg(c.trabajo_segundos)}${intervalo}`)
    } else {
      parts.push(`${fmtSeg(c.trabajo_segundos)} continuos`)
    }
  } else if (c.duracion_total_segundos) {
    parts.push(`${fmtSeg(c.duracion_total_segundos)} continuos`)
  } else if (c.tipo_cardio === 'tabata') {
    parts.push('Tabata 20s/10s × 8 rondas')
  }

  if (c.metros_objetivo) {
    parts.push(c.metros_objetivo >= 1000
      ? `${(c.metros_objetivo / 1000).toFixed(c.metros_objetivo % 1000 === 0 ? 0 : 2)} km`
      : `${c.metros_objetivo} m`)
  }

  if (c.intensidad) {
    parts.push(c.intensidad)
  } else if (c.fc_objetivo_min || c.fc_objetivo_max) {
    if (c.fc_objetivo_min && c.fc_objetivo_max) parts.push(`FC ${c.fc_objetivo_min}-${c.fc_objetivo_max}`)
    else if (c.fc_objetivo_min) parts.push(`FC ≥ ${c.fc_objetivo_min}`)
    else if (c.fc_objetivo_max) parts.push(`FC ≤ ${c.fc_objetivo_max}`)
  }

  return parts.join(' · ')
}
