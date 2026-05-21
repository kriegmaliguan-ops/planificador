'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search, Plus, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { grupoColor } from '@/lib/utils'
import { agregarEjercicioARutina } from '@/app/(profe)/rutinas/[alumnoId]/actions'
import type { DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'
import type { EjercicioEnDia, EstadoDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface AgregarEjercicioModalProps {
  open: boolean
  onClose: () => void
  rutinaId: string
  alumnoId: string
  diaSemana: DiaSemana
  semanaNumero: number
  diaActual: EstadoDia
  ejerciciosLib: EjercicioItem[]
  onAgregado: (diaId: string, ejercicio: EjercicioEnDia) => void
}

export function AgregarEjercicioModal({
  open,
  onClose,
  rutinaId,
  alumnoId,
  diaSemana,
  semanaNumero,
  diaActual,
  ejerciciosLib,
  onAgregado,
}: AgregarEjercicioModalProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EjercicioItem | null>(null)
  const [params, setParams] = useState({ series: 3, repeticiones: '10', peso: '', descanso: 90 })
  const [error, setError] = useState<string | null>(null)

  // IDs de ejercicios ya en este día (para resaltarlos)
  const yaEnDia = new Set(diaActual.ejercicios.map((e) => e.ejercicio_id))

  const filtered = useMemo(
    () =>
      ejerciciosLib.filter((ej) =>
        ej.nombre.toLowerCase().includes(search.toLowerCase())
      ),
    [ejerciciosLib, search]
  )

  function handleClose() {
    setSearch('')
    setSelected(null)
    setParams({ series: 3, repeticiones: '10', peso: '', descanso: 90 })
    setError(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await agregarEjercicioARutina({
        rutinaId,
        diaId: diaActual.id,
        diaSemana,
        semanaNumero,
        alumnoId,
        ejercicioId: selected.id,
        series: Number(params.series) || 3,
        repeticiones: params.repeticiones || '10',
        peso_objetivo: params.peso ? Number(params.peso) : null,
        descanso_segundos: Number(params.descanso) || 90,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      // Notificar al builder para actualizar el estado local
      onAgregado(result.diaId!, {
        id: result.ejercicioRutinaId!,
        ejercicio_id: selected.id,
        nombre: selected.nombre,
        grupos: selected.grupos,
        orden: diaActual.ejercicios.length,
        series: Number(params.series) || 3,
        repeticiones: params.repeticiones || '10',
        peso_objetivo: params.peso ? Number(params.peso) : null,
        descanso_segundos: Number(params.descanso) || 90,
        notas: null,
      })
      handleClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Agregar ejercicio"
      className="max-w-lg max-h-[90vh] flex flex-col"
    >
      <div className="flex flex-col gap-4 overflow-hidden">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Lista de ejercicios */}
        <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sin resultados</p>
          ) : (
            filtered.map((ej) => {
              const enDia = yaEnDia.has(ej.id)
              const isSelected = selected?.id === ej.id
              return (
                <button
                  key={ej.id}
                  type="button"
                  onClick={() => !enDia && setSelected(isSelected ? null : ej)}
                  disabled={enDia}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50'
                      : enDia
                      ? 'opacity-40 cursor-not-allowed bg-slate-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{ej.nombre}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {ej.grupos.map((g) => (
                        <span key={g.id} className={`rounded-full px-1.5 text-xs font-medium ${grupoColor(g.nombre)}`}>
                          {g.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                  {enDia && <span className="text-xs text-slate-400">Ya en este día</span>}
                </button>
              )
            })
          )}
        </div>

        {/* Parámetros — solo visible cuando hay un ejercicio seleccionado */}
        {selected && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Parámetros para "{selected.nombre}"
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Series', key: 'series', type: 'number', min: 1, placeholder: '3' },
                { label: 'Reps', key: 'repeticiones', type: 'text', placeholder: '10' },
                { label: 'Peso kg', key: 'peso', type: 'number', min: 0, step: 0.5, placeholder: '—' },
                { label: 'Desc. s', key: 'descanso', type: 'number', min: 0, step: 15, placeholder: '90' },
              ].map(({ label, key, ...rest }) => (
                <div key={key} className="text-center">
                  <label className="block mb-1 text-xs text-slate-500">{label}</label>
                  <input
                    {...rest}
                    value={(params as any)[key]}
                    onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={isPending} className="flex-1">
                {isPending ? 'Agregando...' : 'Agregar al día'}
              </Button>
            </div>
          </form>
        )}

        {!selected && (
          <p className="text-center text-sm text-slate-400">
            Seleccioná un ejercicio de la lista
          </p>
        )}
      </div>
    </Modal>
  )
}
