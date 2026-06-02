'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Trash2, X, Check, Loader2, AlertTriangle } from 'lucide-react'
import { activarRutina, eliminarRutina } from '@/app/(profe)/rutinas/[alumnoId]/actions'

interface Props {
  rutinaId: string
  alumnoId: string
  esActiva: boolean
  nombre: string
}

export function RutinaActions({ rutinaId, alumnoId, esActiva, nombre }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState<'first' | 'force' | null>(null)
  const [tieneRegistros, setTieneRegistros] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  function handleActivar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const result = await activarRutina(rutinaId, alumnoId)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleDeleteRequest(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete('first')
  }

  function handleDeleteConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    startTransition(async () => {
      const result = await eliminarRutina(rutinaId, alumnoId, confirmDelete === 'force')
      if (result.error) { setError(result.error); return }
      if (result.tieneRegistros && result.tieneRegistros > 0) {
        setTieneRegistros(result.tieneRegistros)
        setConfirmDelete('force')
        return
      }
      setConfirmDelete(null)
      router.refresh()
    })
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(null)
    setTieneRegistros(0)
    setError(null)
  }

  if (confirmDelete === 'force') {
    return (
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 max-w-[280px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[10px] text-amber-800 leading-tight">
            Esta rutina tiene <strong>{tieneRegistros}</strong> registro{tieneRegistros === 1 ? '' : 's'} del alumno.
            Si la borrás se pierde ese historial.
          </p>
        </div>
        <div className="flex gap-1 justify-end">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteConfirm}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Borrar igual
          </button>
        </div>
      </div>
    )
  }

  if (confirmDelete === 'first') {
    return (
      <div className="flex items-center gap-1 shrink-0 rounded-lg border border-red-200 bg-red-50 px-1.5 py-1">
        <span className="text-[10px] font-medium text-red-700 hidden sm:inline">¿Borrar?</span>
        <button
          onClick={handleDeleteConfirm}
          disabled={isPending}
          className="rounded px-1.5 text-red-700"
          title="Confirmar"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button onClick={handleCancel} className="rounded px-1 text-slate-400" title="Cancelar">
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {!esActiva && (
        <button
          onClick={handleActivar}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          title="Activar esta rutina (desactiva la actual)"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          Activar
        </button>
      )}
      <button
        onClick={handleDeleteRequest}
        disabled={isPending}
        className="rounded-lg p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Eliminar rutina"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  )
}
