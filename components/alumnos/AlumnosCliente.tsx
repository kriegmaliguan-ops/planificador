'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, Search, ChevronRight, User, PauseCircle } from 'lucide-react'
import { NuevoAlumnoModal } from './NuevoAlumnoModal'
import type { Profile } from '@/lib/types/database'

type Filtro = 'todos' | 'activos' | 'suspendidos'

interface AlumnosClienteProps {
  alumnos: Profile[]
}

export function AlumnosCliente({ alumnos }: AlumnosClienteProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const suspendidosCount = alumnos.filter(a => a.suspendido).length

  const filtered = alumnos.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch =
      a.nombre.toLowerCase().includes(q) ||
      (a.apellido ?? '').toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    const matchFiltro =
      filtro === 'todos' ? true :
      filtro === 'activos' ? !a.suspendido :
      !!a.suspendido
    return matchSearch && matchFiltro
  })

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {alumnos.length} {alumnos.length === 1 ? 'alumno registrado' : 'alumnos registrados'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Agregar alumno
        </button>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 shrink-0">
          {(['todos', 'activos', 'suspendidos'] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filtro === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'suspendidos' && suspendidosCount > 0
                ? `Suspendidos (${suspendidosCount})`
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700">
            {search ? 'Sin resultados' : 'Todavía no hay alumnos'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {search
              ? 'Probá con otro término de búsqueda.'
              : 'Agregá tu primer alumno para empezar.'}
          </p>
          {!search && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Agregar alumno
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((alumno) => (
            <Link
              key={alumno.id}
              href={`/alumnos/${alumno.id}`}
              className={`group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all hover:shadow-md ${
                alumno.suspendido
                  ? 'ring-amber-200 hover:ring-amber-300 opacity-75'
                  : 'ring-slate-100 hover:ring-blue-100'
              }`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                alumno.suspendido ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {alumno.nombre[0].toUpperCase()}
                {alumno.apellido?.[0].toUpperCase() ?? ''}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">
                    {alumno.nombre} {alumno.apellido ?? ''}
                  </p>
                  {alumno.suspendido && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <PauseCircle className="h-3 w-3" />
                      Suspendido
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">{alumno.email}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}

      <NuevoAlumnoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
