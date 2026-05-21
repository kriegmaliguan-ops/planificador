'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, Layers } from 'lucide-react'
import { grupoColor } from '@/lib/utils'
import { crearGrupo, eliminarGrupo } from './actions'
import type { GrupoMuscular } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

export default function GruposPage() {
  const [grupos, setGrupos] = useState<GrupoMuscular[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('grupos_musculares')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => {
        setGrupos((data as GrupoMuscular[]) ?? [])
        setLoading(false)
      })
  }, [])

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await crearGrupo(nuevoNombre.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setGrupos((prev) => [...prev, { id: result.id!, nombre: nuevoNombre.trim() }].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setNuevoNombre('')
      }
    })
  }

  function handleEliminar(id: string) {
    if (confirmId !== id) {
      setConfirmId(id)
      setTimeout(() => setConfirmId((c) => c === id ? null : c), 3000)
      return
    }
    setConfirmId(null)
    startTransition(async () => {
      const result = await eliminarGrupo(id)
      if (result.error) setError(result.error)
      else setGrupos((prev) => prev.filter((g) => g.id !== id))
    })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grupos musculares</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creá y eliminá grupos según tus necesidades. Los grupos en uso no se pueden eliminar.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleCrear} className="flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Ej: Antebrazos, Cardio HIIT..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={isPending || !nuevoNombre.trim()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
          <Layers className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">No hay grupos. Agregá el primero.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden divide-y divide-slate-50">
          {grupos.map((g) => (
            <div key={g.id} className="flex items-center justify-between px-4 py-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${grupoColor(g.nombre)}`}>
                {g.nombre}
              </span>
              <button
                onClick={() => handleEliminar(g.id)}
                disabled={isPending}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  confirmId === g.id
                    ? 'bg-red-500 text-white'
                    : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmId === g.id ? '¿Confirmar?' : 'Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Total: {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
