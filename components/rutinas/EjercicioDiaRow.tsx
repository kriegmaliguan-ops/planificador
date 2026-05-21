'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { grupoColor } from '@/lib/utils'
import { actualizarEjercicioRutina, removerEjercicioDeRutina } from '@/app/(profe)/rutinas/[alumnoId]/actions'
import type { EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface EjercicioDiaRowProps {
  ejercicio: EjercicioEnDia
  alumnoId: string
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<EjercicioEnDia>) => void
}

export function EjercicioDiaRow({ ejercicio, alumnoId, onRemove, onUpdate }: EjercicioDiaRowProps) {
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [local, setLocal] = useState({
    series: ejercicio.series,
    repeticiones: ejercicio.repeticiones,
    peso_objetivo: ejercicio.peso_objetivo ?? '',
    descanso_segundos: ejercicio.descanso_segundos ?? 90,
    notas: ejercicio.notas ?? '',
  })

  function handleBlur() {
    startTransition(async () => {
      await actualizarEjercicioRutina(ejercicio.id, alumnoId, {
        series: Number(local.series) || 3,
        repeticiones: local.repeticiones || '10',
        peso_objetivo: local.peso_objetivo !== '' ? Number(local.peso_objetivo) : null,
        descanso_segundos: Number(local.descanso_segundos) || null,
        notas: local.notas || null,
      })
      onUpdate(ejercicio.id, {
        series: Number(local.series) || 3,
        repeticiones: local.repeticiones || '10',
        peso_objetivo: local.peso_objetivo !== '' ? Number(local.peso_objetivo) : null,
        descanso_segundos: Number(local.descanso_segundos) || null,
        notas: local.notas || null,
      })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await removerEjercicioDeRutina(ejercicio.id, alumnoId)
      onRemove(ejercicio.id)
    })
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center'

  return (
    <div className={`rounded-xl border bg-white transition-shadow ${isPending ? 'opacity-60' : ''}`}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Nombre + grupos */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 truncate">{ejercicio.nombre}</p>
          {ejercicio.grupos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {ejercicio.grupos.map((g) => (
                <span key={g.id} className={`rounded-full px-1.5 py-0 text-xs font-medium ${grupoColor(g.nombre)}`}>
                  {g.nombre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Campos compactos */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Series</p>
            <input
              type="number"
              min={1}
              max={20}
              value={local.series}
              onChange={(e) => setLocal((p) => ({ ...p, series: Number(e.target.value) }))}
              onBlur={handleBlur}
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Reps</p>
            <input
              type="text"
              value={local.repeticiones}
              onChange={(e) => setLocal((p) => ({ ...p, repeticiones: e.target.value }))}
              onBlur={handleBlur}
              placeholder="10"
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Peso (kg)</p>
            <input
              type="number"
              min={0}
              step={0.5}
              value={local.peso_objetivo}
              onChange={(e) => setLocal((p) => ({ ...p, peso_objetivo: e.target.value }))}
              onBlur={handleBlur}
              placeholder="—"
              className={`${inputClass} w-20`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Descanso</p>
            <input
              type="number"
              min={0}
              step={15}
              value={local.descanso_segundos}
              onChange={(e) => setLocal((p) => ({ ...p, descanso_segundos: Number(e.target.value) }))}
              onBlur={handleBlur}
              placeholder="90s"
              className={`${inputClass} w-16`}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors sm:hidden"
            title="Editar parámetros"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Quitar ejercicio"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Fila expandida (móvil) + notas */}
      {(expanded) && (
        <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Series', key: 'series', type: 'number' },
              { label: 'Reps', key: 'repeticiones', type: 'text' },
              { label: 'Peso (kg)', key: 'peso_objetivo', type: 'number' },
              { label: 'Descanso (s)', key: 'descanso_segundos', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block mb-1 text-xs text-slate-500">{label}</label>
                <input
                  type={type}
                  value={(local as any)[key]}
                  onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas (siempre visible si hay notas, o al expandir) */}
      {(expanded || ejercicio.notas) && (
        <div className="border-t border-slate-100 px-4 py-2">
          <input
            type="text"
            value={local.notas}
            onChange={(e) => setLocal((p) => ({ ...p, notas: e.target.value }))}
            onBlur={handleBlur}
            placeholder="Notas del ejercicio..."
            className="w-full rounded-lg border-0 bg-transparent px-0 py-1 text-xs text-slate-500 outline-none placeholder:text-slate-300"
          />
        </div>
      )}
    </div>
  )
}
