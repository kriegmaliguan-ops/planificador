'use client'

import { useState } from 'react'
import { Plus, Search, BookOpen } from 'lucide-react'
import { EjercicioCard } from './EjercicioCard'
import { EjercicioModal } from './EjercicioModal'
import type { GrupoMuscular } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'

interface EjerciciosClienteProps {
  ejercicios: EjercicioItem[]
  grupos: GrupoMuscular[]
}

export function EjerciciosCliente({ ejercicios, grupos }: EjerciciosClienteProps) {
  const [search, setSearch] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<EjercicioItem | null>(null)

  function openCreate() {
    setEditando(null)
    setModalOpen(true)
  }
  function openEdit(e: EjercicioItem) {
    setEditando(e)
    setModalOpen(true)
  }

  const filtered = ejercicios.filter((ej) => {
    const matchSearch = ej.nombre.toLowerCase().includes(search.toLowerCase())
    const matchGrupo =
      !grupoFiltro || ej.grupos.some((g) => g.id === grupoFiltro)
    return matchSearch && matchGrupo
  })

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biblioteca de ejercicios</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {ejercicios.length} {ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo ejercicio
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Filtro por grupo muscular */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setGrupoFiltro(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !grupoFiltro
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        {grupos.map((g) => (
          <button
            key={g.id}
            onClick={() => setGrupoFiltro(grupoFiltro === g.id ? null : g.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              grupoFiltro === g.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g.nombre}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {search || grupoFiltro ? 'Sin resultados' : 'Biblioteca vacía'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {search || grupoFiltro
                ? 'Probá con otro filtro o búsqueda.'
                : 'Creá tu primer ejercicio para empezar.'}
            </p>
          </div>
          {!search && !grupoFiltro && (
            <button
              onClick={openCreate}
              className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo ejercicio
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ej) => (
            <EjercicioCard key={ej.id} ejercicio={ej} onEdit={openEdit} />
          ))}
        </div>
      )}

      <EjercicioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        grupos={grupos}
        ejercicio={editando}
      />
    </>
  )
}
