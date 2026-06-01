'use client'

import { useState, useTransition } from 'react'
import { Moon } from 'lucide-react'
import { registrarBienestar } from '@/app/(alumno)/rutina/actions'
import { DESCANSO_CONFIG } from '@/lib/utils'

interface Props {
  registroHoy: { descanso: number; notas: string | null } | null
  fecha?: string
  hoy?: string
}

function labelFecha(fecha?: string, hoy?: string): string {
  if (!fecha) return '¿Cómo dormiste anoche?'
  if (fecha === hoy || !hoy) return '¿Cómo dormiste anoche?'
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dia = date.toLocaleDateString('es-AR', { weekday: 'long' })
  const diaNum = date.getDate()
  const mes = date.toLocaleDateString('es-AR', { month: 'long' })
  return `Sueño del ${dia} ${diaNum} de ${mes}`
}

export function BienestarCard({ registroHoy, fecha, hoy }: Props) {
  const [guardado, setGuardado] = useState(!!registroHoy)
  const [descanso, setDescanso] = useState<number | ''>(registroHoy?.descanso ?? '')
  const [notas, setNotas] = useState(registroHoy?.notas ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGuardar() {
    if (descanso === '') return
    setError(null)
    startTransition(async () => {
      const result = await registrarBienestar({
        descanso: Number(descanso),
        notas: notas.trim() || null,
        fecha,
      })
      if (result.error) setError(result.error)
      else setGuardado(true)
    })
  }

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
      guardado ? 'ring-emerald-200' : 'ring-slate-100'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Moon className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="flex-1 text-sm font-semibold text-slate-700">{labelFecha(fecha, hoy)}</p>
        {guardado && (
          <span className="text-xs font-medium text-emerald-600">✓ Registrado</span>
        )}
      </div>

      {/* Formulario — siempre visible */}
      <div className="px-4 py-4 space-y-3">
        {/* Escala 1-7 */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const conf = DESCANSO_CONFIG[n]
            const selected = descanso === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => { setDescanso(n); setGuardado(false) }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 transition-all ${
                  selected ? conf.color : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="text-sm font-bold">{n}</span>
                <span className={`text-[9px] font-medium leading-tight text-center ${
                  selected ? 'opacity-90' : 'opacity-75'
                }`}>
                  {conf.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Notas */}
        <input
          type="text"
          value={notas}
          onChange={(e) => { setNotas(e.target.value); setGuardado(false) }}
          placeholder="Observaciones opcionales..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleGuardar}
          disabled={isPending || descanso === ''}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
        >
          {isPending ? 'Guardando...' : guardado ? 'Actualizar' : 'Guardar sueño'}
        </button>
      </div>
    </div>
  )
}
