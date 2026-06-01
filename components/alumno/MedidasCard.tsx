'use client'

import { useState, useTransition } from 'react'
import { Ruler, ChevronDown, ChevronUp } from 'lucide-react'
import { registrarMedidas } from '@/app/(alumno)/rutina/actions'

interface Props {
  registroHoy: MedidaHoy | null
}

interface MedidaHoy {
  cintura_cm: number | null
  pecho_cm: number | null
  brazo_cm: number | null
  muslo_cm: number | null
  pantorrilla_cm: number | null
  cadera_cm: number | null
  cuello_cm: number | null
  notas: string | null
}

const CAMPOS: Array<{ key: keyof Omit<MedidaHoy, 'notas'>; label: string; placeholder: string }> = [
  { key: 'cintura_cm',     label: 'Cintura',     placeholder: '85' },
  { key: 'pecho_cm',       label: 'Pecho',       placeholder: '100' },
  { key: 'cadera_cm',      label: 'Cadera',      placeholder: '95' },
  { key: 'brazo_cm',       label: 'Brazo',       placeholder: '38' },
  { key: 'muslo_cm',       label: 'Muslo',       placeholder: '58' },
  { key: 'pantorrilla_cm', label: 'Pantorrilla', placeholder: '38' },
  { key: 'cuello_cm',      label: 'Cuello',      placeholder: '38' },
]

export function MedidasCard({ registroHoy }: Props) {
  const [expanded, setExpanded] = useState(!!registroHoy)
  const [guardado, setGuardado] = useState(!!registroHoy)
  const [valores, setValores] = useState<Record<string, string>>({
    cintura_cm: registroHoy?.cintura_cm?.toString() ?? '',
    pecho_cm: registroHoy?.pecho_cm?.toString() ?? '',
    cadera_cm: registroHoy?.cadera_cm?.toString() ?? '',
    brazo_cm: registroHoy?.brazo_cm?.toString() ?? '',
    muslo_cm: registroHoy?.muslo_cm?.toString() ?? '',
    pantorrilla_cm: registroHoy?.pantorrilla_cm?.toString() ?? '',
    cuello_cm: registroHoy?.cuello_cm?.toString() ?? '',
  })
  const [notas, setNotas] = useState(registroHoy?.notas ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function parseNum(v: string): number | null {
    if (v === '' || v === '.') return null
    const n = parseFloat(v)
    return Number.isNaN(n) ? null : n
  }

  function handleChange(key: string, value: string) {
    setValores((p) => ({ ...p, [key]: value }))
    setGuardado(false)
  }

  function handleGuardar() {
    setError(null)
    startTransition(async () => {
      const result = await registrarMedidas({
        cintura_cm: parseNum(valores.cintura_cm),
        pecho_cm: parseNum(valores.pecho_cm),
        brazo_cm: parseNum(valores.brazo_cm),
        muslo_cm: parseNum(valores.muslo_cm),
        pantorrilla_cm: parseNum(valores.pantorrilla_cm),
        cadera_cm: parseNum(valores.cadera_cm),
        cuello_cm: parseNum(valores.cuello_cm),
        notas: notas.trim() || null,
      })
      if (result.error) setError(result.error)
      else setGuardado(true)
    })
  }

  const algunoCargado = Object.values(valores).some((v) => v !== '' && v !== '.')

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
      guardado ? 'ring-emerald-200' : 'ring-slate-100'
    }`}>
      {/* Header (clickable para colapsar) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <Ruler className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="flex-1 text-left text-sm font-semibold text-slate-700">
          Medidas corporales
          <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
        </p>
        {guardado && (
          <span className="text-xs font-medium text-emerald-600">✓ Registradas</span>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {CAMPOS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block mb-1 text-xs font-medium text-slate-600">{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="300"
                    value={valores[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">cm</span>
                </div>
              </div>
            ))}
          </div>

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
            disabled={isPending || !algunoCargado}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
          >
            {isPending ? 'Guardando...' : guardado ? 'Actualizar' : 'Guardar medidas'}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Tomate las medidas en ayunas, idealmente cada 2 semanas.
          </p>
        </div>
      )}
    </div>
  )
}
