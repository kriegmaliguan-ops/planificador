'use client'

import { useEffect, useState } from 'react'
import { Search, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { grupoColor } from '@/lib/utils'
import type { GrupoMuscular } from '@/lib/types/database'

interface EjercicioItem {
  id: string
  nombre: string
  descripcion: string | null
  grupos: GrupoMuscular[]
}

export default function BibliotecaPage() {
  const [ejercicios, setEjercicios] = useState<EjercicioItem[]>([])
  const [grupos, setGrupos] = useState<GrupoMuscular[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('ejercicios')
        .select('id, nombre, descripcion, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
        .order('nombre'),
      supabase.from('grupos_musculares').select('id, nombre').order('nombre'),
    ]).then(([ejResult, grResult]) => {
      const ejs = ((ejResult.data as any[]) ?? []).map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        grupos: (e.grupos ?? []).map((g: any) => g.grupo as GrupoMuscular),
      }))
      setEjercicios(ejs)
      setGrupos((grResult.data as GrupoMuscular[]) ?? [])
      setLoading(false)
    })
  }, [])

  const filtrados = ejercicios.filter((e) => {
    const matchBusqueda = e.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchGrupo = !filtroGrupo || e.grupos.some((g) => g.id === filtroGrupo)
    return matchBusqueda && matchGrupo
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

      {/* Header */}
      <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Biblioteca</p>
            <h1 className="mt-1 text-2xl font-bold">Ejercicios</h1>
          </div>
          <Dumbbell className="h-6 w-6 text-slate-500" />
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Filtros por grupo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroGrupo(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !filtroGrupo ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        {grupos.map((g) => (
          <button
            key={g.id}
            onClick={() => setFiltroGrupo(filtroGrupo === g.id ? null : g.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtroGrupo === g.id ? grupoColor(g.nombre) : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g.nombre}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-12 text-center ring-1 ring-slate-100">
          <Dumbbell className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">No hay ejercicios que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((ej) => (
            <div
              key={ej.id}
              className="rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100"
            >
              <p className="font-semibold text-slate-900">{ej.nombre}</p>
              {ej.grupos.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ej.grupos.map((g) => (
                    <span
                      key={g.id}
                      className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}
                    >
                      {g.nombre}
                    </span>
                  ))}
                </div>
              )}
              {ej.descripcion && (
                <p className="mt-1.5 text-xs text-slate-400">{ej.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
