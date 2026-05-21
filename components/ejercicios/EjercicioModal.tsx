'use client'

import { useTransition, useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { crearEjercicio, editarEjercicio } from '@/app/(profe)/ejercicios/actions'
import { grupoColor } from '@/lib/utils'
import type { GrupoMuscular } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'

interface EjercicioModalProps {
  open: boolean
  onClose: () => void
  grupos: GrupoMuscular[]
  ejercicio?: EjercicioItem | null // si viene = modo edición
}

export function EjercicioModal({ open, onClose, grupos, ejercicio }: EjercicioModalProps) {
  const isEdit = !!ejercicio
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Resetear estado cuando el modal abre/cierra
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(false)
    }
  }, [open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEdit
        ? await editarEjercicio(ejercicio.id, formData)
        : await crearEjercicio(formData)
      if (result.error) setError(result.error)
      else { setSuccess(true); setTimeout(onClose, 900) }
    })
  }

  const title = isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-lg">
      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="font-semibold text-slate-900">
            {isEdit ? '¡Ejercicio actualizado!' : '¡Ejercicio creado!'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nombre */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              required
              defaultValue={ejercicio?.nombre ?? ''}
              placeholder="Ej: Press de banca"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Descripción <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </label>
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={ejercicio?.descripcion ?? ''}
              placeholder="Breve descripción de la ejecución..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Video <span className="text-slate-400 text-xs font-normal">(URL YouTube / opcional)</span>
            </label>
            <input
              name="video_url"
              type="url"
              defaultValue={ejercicio?.video_url ?? ''}
              placeholder="https://youtube.com/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Grupos musculares */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Grupos musculares
            </label>
            <div className="grid grid-cols-3 gap-2">
              {grupos.map((g) => {
                const isChecked = ejercicio?.grupos.some((eg) => eg.id === g.id) ?? false
                return (
                  <label
                    key={g.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      name="grupos"
                      value={g.id}
                      defaultChecked={isChecked}
                      className="accent-blue-600"
                    />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${grupoColor(g.nombre)}`}>
                      {g.nombre}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear ejercicio'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
