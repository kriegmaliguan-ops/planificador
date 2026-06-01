'use client'

import { useState, useTransition } from 'react'
import { Trash2, Check, X, Loader2 } from 'lucide-react'
import { eliminarPlantilla } from './actions'

export function EliminarPlantillaBtn({ plantillaId, nombre }: { plantillaId: string; nombre: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await eliminarPlantilla(plantillaId)
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1">
        <span className="text-[10px] font-medium text-red-700 hidden sm:inline">Borrar "{nombre}"?</span>
        <span className="text-[10px] font-medium text-red-700 sm:hidden">¿Borrar?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded px-1.5 text-xs font-bold text-red-700 hover:text-red-800 disabled:opacity-50"
          title="Confirmar"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded px-1 text-slate-500 hover:text-slate-700"
          title="Cancelar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      title="Eliminar plantilla"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
