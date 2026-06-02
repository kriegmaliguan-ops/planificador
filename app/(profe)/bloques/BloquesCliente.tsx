'use client'

import { useState, useTransition } from 'react'
import { Layers, Pencil, Trash2, ChevronDown, ChevronUp, Check, X, Loader2, Dumbbell } from 'lucide-react'
import { renombrarBloque, eliminarBloque } from './actions'
import type { BloqueItem } from './page'

interface Props {
  initial: BloqueItem[]
}

export function BloquesCliente({ initial }: Props) {
  const [items, setItems] = useState<BloqueItem[]>(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
        <Layers className="h-12 w-12 text-slate-300" />
        <div>
          <p className="font-medium text-slate-700">Todavía no hay bloques</p>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto px-4">
            Los bloques se crean desde el builder de rutina con el botón
            <strong> "Guardar día como bloque"</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((b) => (
        <div key={b.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          {editingId === b.id ? (
            <RenameForm
              bloque={b}
              onSaved={(updated) => {
                setItems((p) => p.map((x) => (x.id === b.id ? { ...x, ...updated } : x)))
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start gap-3 px-4 sm:px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Layers className="h-5 w-5 text-violet-600" />
              </div>
              <button
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-semibold text-slate-900">{b.nombre}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {b.cantEjercicios} ejercicio{b.cantEjercicios === 1 ? '' : 's'}
                </p>
                {b.descripcion && !expandedId && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{b.descripcion}</p>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  {expandedId === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingId(b.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Renombrar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <DeleteBtn
                  id={b.id}
                  confirming={confirmDelete === b.id}
                  onConfirm={() => setConfirmDelete(b.id)}
                  onCancel={() => setConfirmDelete(null)}
                  onDone={() => {
                    setItems((p) => p.filter((x) => x.id !== b.id))
                    setConfirmDelete(null)
                  }}
                />
              </div>
            </div>
          )}

          {expandedId === b.id && editingId !== b.id && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3">
              {b.descripcion && (
                <p className="mb-3 text-sm text-slate-600 whitespace-pre-wrap">{b.descripcion}</p>
              )}
              <ul className="divide-y divide-slate-200/60 rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
                {b.ejercicios.map((ej, i) => (
                  <li key={ej.id} className="flex items-center gap-3 px-3 py-2">
                    <Dumbbell className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    <span className="text-xs font-medium text-slate-400 w-5 text-right shrink-0">{i + 1}.</span>
                    <span className="flex-1 text-sm font-medium text-slate-800 truncate">{ej.nombre}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {ej.series}×{ej.repeticiones}
                      {ej.peso_objetivo != null && ` · ${ej.peso_objetivo}kg`}
                      {ej.rpe_objetivo != null && ` · RPE ${ej.rpe_objetivo}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RenameForm({
  bloque, onSaved, onCancel,
}: {
  bloque: BloqueItem
  onSaved: (updated: { nombre: string; descripcion: string | null }) => void
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState(bloque.nombre)
  const [descripcion, setDescripcion] = useState(bloque.descripcion ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await renombrarBloque(bloque.id, nombre, descripcion || null)
      if (result.error) { setError(result.error); return }
      onSaved({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-2">
      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={2}
        placeholder="Descripción (opcional)"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !nombre.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  )
}

function DeleteBtn({
  id, confirming, onConfirm, onCancel, onDone,
}: {
  id: string; confirming: boolean
  onConfirm: () => void; onCancel: () => void; onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  function handle() {
    startTransition(async () => {
      const r = await eliminarBloque(id)
      if (!r.error) onDone()
    })
  }
  if (confirming) {
    return (
      <div className="flex items-center gap-0.5 rounded-lg border border-red-200 bg-red-50 px-1.5 py-1">
        <span className="text-[10px] font-medium text-red-700 hidden sm:inline">¿Borrar?</span>
        <button onClick={handle} disabled={isPending} className="rounded px-1.5 text-red-700">
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
