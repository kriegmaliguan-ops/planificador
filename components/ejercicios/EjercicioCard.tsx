'use client'

import { useTransition, useState } from 'react'
import { Pencil, Trash2, Video, Loader2 } from 'lucide-react'
import { grupoColor } from '@/lib/utils'
import { eliminarEjercicio } from '@/app/(profe)/ejercicios/actions'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'

interface EjercicioCardProps {
  ejercicio: EjercicioItem
  onEdit: (e: EjercicioItem) => void
}

export function EjercicioCard({ ejercicio, onEdit }: EjercicioCardProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000) // reset si no confirma
      return
    }
    startTransition(async () => {
      await eliminarEjercicio(ejercicio.id)
    })
  }

  return (
    <div className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 leading-snug">{ejercicio.nombre}</h3>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {ejercicio.video_url && (
            <a
              href={ejercicio.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              title="Ver video"
            >
              <Video className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => onEdit(ejercicio)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className={`rounded-lg p-1.5 transition-colors ${
              confirmDelete
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-red-500'
            }`}
            title={confirmDelete ? 'Clic para confirmar' : 'Eliminar'}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Descripción */}
      {ejercicio.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{ejercicio.descripcion}</p>
      )}

      {/* Grupos musculares */}
      {ejercicio.grupos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ejercicio.grupos.map((g) => (
            <span
              key={g.id}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${grupoColor(g.nombre)}`}
            >
              {g.nombre}
            </span>
          ))}
        </div>
      )}

      {confirmDelete && (
        <p className="mt-3 text-xs text-red-500 font-medium animate-pulse">
          ¿Confirmar eliminación? Clic de nuevo para borrar.
        </p>
      )}
    </div>
  )
}
