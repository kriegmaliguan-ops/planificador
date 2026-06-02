'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Check, PlayCircle, Loader2, Clock, Flame } from 'lucide-react'
import { crearCalentamiento, actualizarCalentamiento, eliminarCalentamiento } from './actions'
import type { CalentamientoItem } from './page'

interface Props {
  initial: CalentamientoItem[]
}

export function CalentamientosCliente({ initial }: Props) {
  const [items, setItems] = useState<CalentamientoItem[]>(initial)
  const [editando, setEditando] = useState<CalentamientoItem | null>(null)
  const [creando, setCreando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleCreado(nuevo: CalentamientoItem) {
    setItems((p) => [...p, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setCreando(false)
  }

  function handleActualizado(actualizado: CalentamientoItem) {
    setItems((p) => p.map((c) => (c.id === actualizado.id ? actualizado : c)).sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setEditando(null)
  }

  function handleEliminado(id: string) {
    setItems((p) => p.filter((c) => c.id !== id))
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo calentamiento
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <Flame className="h-12 w-12 text-slate-300" />
          <div>
            <p className="font-medium text-slate-700">Todavía no hay calentamientos</p>
            <p className="mt-1 text-sm text-slate-400">Agregá uno para asignarlo a los días de las rutinas.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          {items.map((c) => (
            <div key={c.id} className="flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{c.nombre}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {c.duracion_minutos != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.duracion_minutos} min
                    </span>
                  )}
                  {c.video_url && (
                    <a
                      href={c.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-500"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Video
                    </a>
                  )}
                </div>
                {c.descripcion && (
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{c.descripcion}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setEditando(c)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <DeleteBtn
                  id={c.id}
                  nombre={c.nombre}
                  confirming={confirmDelete === c.id}
                  onConfirm={() => setConfirmDelete(c.id)}
                  onCancel={() => setConfirmDelete(null)}
                  onDone={() => handleEliminado(c.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {(creando || editando) && (
        <FormModal
          initial={editando}
          onClose={() => { setCreando(false); setEditando(null) }}
          onCreado={handleCreado}
          onActualizado={handleActualizado}
        />
      )}
    </>
  )
}

function DeleteBtn({
  id, nombre, confirming, onConfirm, onCancel, onDone,
}: {
  id: string; nombre: string; confirming: boolean
  onConfirm: () => void; onCancel: () => void; onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  function handleDelete() {
    startTransition(async () => {
      const result = await eliminarCalentamiento(id)
      if (!result.error) onDone()
    })
  }
  if (confirming) {
    return (
      <div className="flex items-center gap-0.5 rounded-lg border border-red-200 bg-red-50 px-1.5 py-1">
        <span className="text-[10px] font-medium text-red-700 hidden sm:inline">¿Borrar?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded px-1.5 text-xs font-bold text-red-700 hover:text-red-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button onClick={onCancel} className="rounded px-1 text-slate-400">
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={onConfirm}
      className="rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      title="Eliminar"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function FormModal({
  initial, onClose, onCreado, onActualizado,
}: {
  initial: CalentamientoItem | null
  onClose: () => void
  onCreado: (c: CalentamientoItem) => void
  onActualizado: (c: CalentamientoItem) => void
}) {
  const editing = !!initial
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [duracion, setDuracion] = useState<string>(initial?.duracion_minutos?.toString() ?? '')
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      duracion_minutos: duracion ? Number(duracion) : null,
      video_url: videoUrl.trim() || null,
    }
    startTransition(async () => {
      if (editing && initial) {
        const result = await actualizarCalentamiento(initial.id, payload)
        if (result.error) { setError(result.error); return }
        onActualizado({ id: initial.id, ...payload })
      } else {
        const result = await crearCalentamiento(payload)
        if (result.error || !result.id) { setError(result.error ?? 'Error'); return }
        onCreado({ id: result.id, ...payload })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => !isPending && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {editing ? 'Editar calentamiento' : 'Nuevo calentamiento'}
          </h3>
          <button onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Movilidad articular completa"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Ej: Tren superior. Círculos de brazo, rotaciones de cuello, 10 push-ups suaves..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="10"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !nombre.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
