'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { crearPlantilla } from './actions'

export function CrearPlantillaBtn() {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await crearPlantilla(nombre.trim())
      if (result.error) { setError(result.error); return }
      router.push(`/plantillas/${result.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nueva plantilla
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nueva plantilla</h3>
                <p className="mt-0.5 text-xs text-slate-500">Dale un nombre y arrancá a armarla.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCrear} className="space-y-4">
              <input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Fuerza para principiantes — 4 días"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
                disabled={isPending}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isPending || !nombre.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Creando...' : 'Crear y editar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
