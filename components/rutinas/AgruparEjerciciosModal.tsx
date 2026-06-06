'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, Check, Link2 } from 'lucide-react'
import { agruparEjercicios } from '@/app/(profe)/rutinas/[alumnoId]/actions'
import { MODALIDADES, type Modalidad } from '@/lib/modalidades'
import type { EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface Props {
  modalidad: 'biserie' | 'superserie' | 'triserie'
  ejercicios: EjercicioEnDia[]  // ejercicios NO agrupados (libres)
  alumnoId: string
  onClose: () => void
  onAgrupado: () => void
}

export function AgruparEjerciciosModal({
  modalidad, ejercicios, alumnoId, onClose, onAgrupado,
}: Props) {
  const requerido = modalidad === 'triserie' ? 3 : 2
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const info = MODALIDADES[modalidad as Modalidad]
  const accent =
    modalidad === 'biserie' ? 'purple'
    : modalidad === 'superserie' ? 'fuchsia'
    : 'indigo'

  function toggle(id: string) {
    setError(null)
    setSelected((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      if (p.length >= requerido) return [...p.slice(1), id]  // descartá el más viejo
      return [...p, id]
    })
  }

  function handleAgrupar() {
    if (selected.length !== requerido) {
      setError(`Tenés que elegir ${requerido} ejercicios.`)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await agruparEjercicios({
        ejercicioIds: selected,
        modalidad,
        alumnoId,
      })
      if (result.error) { setError(result.error); return }
      onAgrupado()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start gap-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${accent}-100`}>
            <Link2 className={`h-4 w-4 text-${accent}-600`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Crear {info.label}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Elegí {requerido} ejercicios para encadenar. Se ejecutan seguidos sin descanso.
            </p>
          </div>
          <button onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className={`mb-3 rounded-lg bg-${accent}-50 px-3 py-2 text-xs text-${accent}-900 leading-snug`}>
          {info.descripcion}
        </p>

        {ejercicios.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 text-center">
            No hay ejercicios sueltos para agrupar. Primero agregá ejercicios al día.
          </p>
        ) : ejercicios.length < requerido ? (
          <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-700 text-center">
            Necesitás al menos {requerido} ejercicios sin agrupar en el día. Hay {ejercicios.length}.
          </p>
        ) : (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Seleccionados: {selected.length} / {requerido}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 mb-3">
              {ejercicios.map((ej) => {
                const idx = selected.indexOf(ej.id)
                const isSelected = idx !== -1
                return (
                  <button
                    key={ej.id}
                    onClick={() => toggle(ej.id)}
                    disabled={isPending}
                    className={`w-full flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition-all ${
                      isSelected
                        ? `border-${accent}-500 bg-${accent}-50`
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected ? `bg-${accent}-600 text-white` : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isSelected ? idx + 1 : ''}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{ej.nombre}</p>
                      <p className="text-[10px] text-slate-500">
                        {ej.series}×{ej.duracion_segundos ? `${ej.duracion_segundos}s` : ej.repeticiones}
                        {ej.peso_objetivo ? ` · ${ej.peso_objetivo}kg` : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgrupar}
            disabled={isPending || selected.length !== requerido}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 bg-${accent}-600 hover:bg-${accent}-500`}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Agrupar
          </button>
        </div>
      </div>
    </div>
  )
}
