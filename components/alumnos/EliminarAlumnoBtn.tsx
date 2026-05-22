'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { eliminarAlumno } from '@/app/(profe)/alumnos/actions'

interface Props {
  alumnoId: string
  nombre: string
}

export function EliminarAlumnoBtn({ alumnoId, nombre }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleEliminar() {
    setError(null)
    startTransition(async () => {
      const result = await eliminarAlumno(alumnoId)
      if (result?.error) {
        setError(result.error)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar alumno
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Modal de confirmación */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Dialogo */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">¿Eliminar alumno?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Vas a eliminar a <strong>{nombre}</strong> y todos sus datos:
                  rutinas, progreso e historial. Esta acción{' '}
                  <span className="font-semibold text-red-600">no se puede deshacer</span>.
                </p>
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
