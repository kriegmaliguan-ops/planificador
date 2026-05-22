'use client'

import { useState, useTransition } from 'react'
import { Scale } from 'lucide-react'
import { registrarPeso } from '@/app/(alumno)/rutina/actions'

interface Props {
  registroHoy: { peso_kg: number; notas: string | null } | null
  fecha?: string
}

export function PesoCard({ registroHoy, fecha }: Props) {
  const [guardado, setGuardado] = useState(!!registroHoy)
  const [peso, setPeso] = useState<string>(registroHoy?.peso_kg?.toString() ?? '')
  const [notas, setNotas] = useState(registroHoy?.notas ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGuardar() {
    const kg = parseFloat(peso)
    if (isNaN(kg) || kg <= 0) return
    setError(null)
    startTransition(async () => {
      const result = await registrarPeso({ pesoKg: kg, notas: notas.trim() || null, fecha })
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
        <Scale className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="flex-1 text-sm font-semibold text-slate-700">Registrar peso corporal</p>
        {guardado && (
          <span className="text-xs font-medium text-emerald-600">✓ Registrado</span>
        )}
      </div>

      {/* Formulario */}
      <div className="px-4 py-4 space-y-3">
        {/* Input peso */}
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.1"
            min="20"
            max="300"
            value={peso}
            onChange={(e) => { setPeso(e.target.value); setGuardado(false) }}
            placeholder="75.5"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center"
          />
          <span className="text-base font-semibold text-slate-500 shrink-0">kg</span>
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
          disabled={isPending || !peso || parseFloat(peso) <= 0}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
        >
          {isPending ? 'Guardando...' : guardado ? 'Actualizar' : 'Guardar peso'}
        </button>
      </div>
    </div>
  )
}
