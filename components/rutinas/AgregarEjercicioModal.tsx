'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Search, Check, Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { grupoColor } from '@/lib/utils'
import { agregarEjercicioARutina } from '@/app/(profe)/rutinas/[alumnoId]/actions'
import type { DiaSemana } from '@/lib/types/database'
import type { EjercicioItem } from '@/app/(profe)/ejercicios/page'
import type { EjercicioEnDia, EstadoDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface AgregarEjercicioModalProps {
  open: boolean
  onClose: () => void
  rutinaId: string
  alumnoId: string
  diaSemana: DiaSemana
  semanaNumero: number
  diaActual: EstadoDia
  ejerciciosLib: EjercicioItem[]
  onAgregado: (diaId: string, ejercicios: EjercicioEnDia[]) => void
  modalidadPre?: string             // 'normal' (default) o cualquier otra modalidad
  agrupacionPre?: string | null     // letra de agrupación (para biserie/superserie/triserie)
  maxSeleccionados?: number         // si es 1, fuerza single-select
  tituloPersonalizado?: string      // header del modal
  esCardio?: boolean                 // modo cardio: filtro grupo Cardio + form de config
  grupoForzadoNombre?: string        // si se pasa, filtra automaticamente por ese grupo (case-insensitive)
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
  modalidadPre = 'normal',
  agrupacionPre = null,
  maxSeleccionados,
  tituloPersonalizado,
  esCardio = false,
  grupoForzadoNombre,
}: AgregarEjercicioModalProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [params, setParams] = useState({ series: 3, repeticiones: '10', peso: '', descanso: 90 })
  const [cardioParams, setCardioParams] = useState({
    series: 1,
    trabajo_segundos: '1800',  // 30 min por defecto
    descanso_intervalo_segundos: '',
    descanso_segundos: '',
    intensidad: '',
    metros_objetivo: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Si esCardio o pasaron grupoForzadoNombre, prefiltrar al abrir
  useEffect(() => {
    if (!open) return
    const buscarNombre = grupoForzadoNombre ?? (esCardio ? 'cardio' : null)
    if (!buscarNombre) return
    // Buscar el id del grupo por nombre (case-insensitive)
    const lower = buscarNombre.toLowerCase()
    for (const ej of ejerciciosLib) {
      for (const g of ej.grupos) {
        if (g.nombre.toLowerCase() === lower) {
          setGrupoFiltro(g.id)
          return
        }
      }
    }
  }, [open, esCardio, grupoForzadoNombre, ejerciciosLib])

  const yaEnDia = new Set(diaActual.ejercicios.map((e) => e.ejercicio_id))

  // Lista de todos los grupos musculares disponibles (sacados de los ejercicios)
  const todosGrupos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>()
    for (const ej of ejerciciosLib) {
      for (const g of ej.grupos) map.set(g.id, { id: g.id, nombre: g.nombre })
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [ejerciciosLib])

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return ejerciciosLib.filter((ej) => {
      // Filtro por grupo
      if (grupoFiltro && !ej.grupos.some((g) => g.id === grupoFiltro)) return false
      // Filtro por texto: nombre del ejercicio o nombre de cualquier grupo muscular
      if (!term) return true
      if (normalize(ej.nombre).includes(term)) return true
      if (ej.grupos.some((g) => normalize(g.nombre).includes(term))) return true
      return false
    })
  }, [ejerciciosLib, search, grupoFiltro])

  const selectedItems = ejerciciosLib.filter((e) => selectedIds.has(e.id))

  function toggle(ej: EjercicioItem) {
    if (yaEnDia.has(ej.id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(ej.id)) {
        next.delete(ej.id)
      } else {
        // Si hay límite y ya alcanzamos, reemplazar el último
        if (maxSeleccionados && next.size >= maxSeleccionados) {
          if (maxSeleccionados === 1) {
            next.clear()
          } else {
            const firstId = next.values().next().value
            if (firstId) next.delete(firstId)
          }
        }
        next.add(ej.id)
      }
      return next
    })
  }

  function handleClose() {
    setSearch('')
    setGrupoFiltro(null)
    setSelectedIds(new Set())
    setParams({ series: 3, repeticiones: '10', peso: '', descanso: 90 })
    setCardioParams({ series: 1, trabajo_segundos: '1800', descanso_intervalo_segundos: '', descanso_segundos: '', intensidad: '', metros_objetivo: '' })
    setError(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) return
    setError(null)

    startTransition(async () => {
      let finalDiaId = diaActual.id
      const added: EjercicioEnDia[] = []

      for (const ej of selectedItems) {
        const cardioPayload = esCardio ? {
          trabajo_segundos: cardioParams.trabajo_segundos !== '' ? Number(cardioParams.trabajo_segundos) : null,
          descanso_intervalo_segundos: cardioParams.descanso_intervalo_segundos !== '' ? Number(cardioParams.descanso_intervalo_segundos) : null,
          intensidad: cardioParams.intensidad || null,
          metros_objetivo: cardioParams.metros_objetivo !== '' ? Number(cardioParams.metros_objetivo) : null,
        } : null

        const descansoCardio = esCardio && cardioParams.descanso_segundos !== ''
          ? Number(cardioParams.descanso_segundos)
          : null

        const result = await agregarEjercicioARutina({
          rutinaId,
          diaId: finalDiaId,
          diaSemana,
          semanaNumero,
          alumnoId,
          ejercicioId: ej.id,
          series: esCardio ? (Number(cardioParams.series) || 1) : (Number(params.series) || 3),
          repeticiones: esCardio ? '—' : (params.repeticiones || '10'),
          peso_objetivo: esCardio ? null : (params.peso ? Number(params.peso) : null),
          descanso_segundos: esCardio ? (descansoCardio ?? 0) : (Number(params.descanso) || 90),
          modalidad: esCardio ? 'cardio' : modalidadPre,
          agrupacion: esCardio ? null : agrupacionPre,
          ...(cardioPayload ?? {}),
        })
        if (result.error) { setError(result.error); return }
        finalDiaId = result.diaId!
        added.push({
          id: result.ejercicioRutinaId!,
          ejercicio_id: ej.id,
          nombre: ej.nombre,
          grupos: ej.grupos,
          orden: diaActual.ejercicios.length + added.length,
          series: esCardio ? (Number(cardioParams.series) || 1) : (Number(params.series) || 3),
          repeticiones: esCardio ? '—' : (params.repeticiones || '10'),
          peso_objetivo: esCardio ? null : (params.peso ? Number(params.peso) : null),
          descanso_segundos: esCardio ? (descansoCardio ?? 0) : (Number(params.descanso) || 90),
          duracion_segundos: null,
          notas: null,
          rpe_objetivo: null,
          modalidad: (esCardio ? 'cardio' : (modalidadPre ?? 'normal')) as any,
          agrupacion: esCardio ? null : (agrupacionPre ?? null),
          ...(cardioPayload ?? {}),
        } as any)
      }

      onAgregado(finalDiaId!, added)
      handleClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={tituloPersonalizado ?? 'Agregar ejercicios'}
      className="max-w-lg max-h-[90vh] flex flex-col"
    >
      <div className="flex flex-col gap-4 overflow-hidden">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Buscar por ejercicio o grupo (pecho, cardio, glúteo...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Chips de grupos musculares */}
        {todosGrupos.length > 0 && (
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            <button
              type="button"
              onClick={() => setGrupoFiltro(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                grupoFiltro === null
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
              <span className={`ml-1.5 opacity-70 ${grupoFiltro === null ? '' : 'text-slate-400'}`}>
                {ejerciciosLib.length}
              </span>
            </button>
            {todosGrupos.map((g) => {
              const isActive = grupoFiltro === g.id
              const count = ejerciciosLib.filter((e) => e.grupos.some((x) => x.id === g.id)).length
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrupoFiltro(isActive ? null : g.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? `${grupoColor(g.nombre)} ring-2 ring-offset-1 ring-slate-400`
                      : `${grupoColor(g.nombre)} opacity-70 hover:opacity-100`
                  }`}
                >
                  {g.nombre}
                  <span className="ml-1.5 opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Contador de seleccionados */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 ring-1 ring-blue-200">
            <span className="text-sm font-semibold text-blue-700">
              {selectedIds.size} ejercicio{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* Lista de ejercicios */}
        <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Sin resultados</p>
              {(search || grupoFiltro) && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setGrupoFiltro(null) }}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-500"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map((ej) => {
              const enDia = yaEnDia.has(ej.id)
              const isSelected = selectedIds.has(ej.id)
              return (
                <button
                  key={ej.id}
                  type="button"
                  onClick={() => toggle(ej)}
                  disabled={enDia}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-50'
                    : enDia ? 'opacity-40 cursor-not-allowed bg-slate-50'
                    : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5" />}
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

        {/* Parámetros compartidos */}
        {selectedIds.size > 0 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {esCardio ? `Cardio: "${selectedItems[0]?.nombre}"` : `Parámetros para ${selectedIds.size === 1 ? `"${selectedItems[0]?.nombre}"` : `los ${selectedIds.size} ejercicios`}`}
            </p>

            {esCardio ? (
              <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">🫀 Parámetros de cardio</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-xs text-slate-600">Series</label>
                    <input
                      type="number"
                      min={1}
                      value={cardioParams.series}
                      onChange={(e) => setCardioParams((p) => ({ ...p, series: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-slate-600">Tiempo por serie (s)</label>
                    <input
                      type="number"
                      min={0}
                      value={cardioParams.trabajo_segundos}
                      onChange={(e) => setCardioParams((p) => ({ ...p, trabajo_segundos: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      placeholder="1800 = 30 min"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-slate-600">Intervalo entre series (s)</label>
                    <input
                      type="number"
                      min={0}
                      value={cardioParams.descanso_intervalo_segundos}
                      onChange={(e) => setCardioParams((p) => ({ ...p, descanso_intervalo_segundos: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-slate-600">Descanso final (s)</label>
                    <input
                      type="number"
                      min={0}
                      step={15}
                      value={cardioParams.descanso_segundos}
                      onChange={(e) => setCardioParams((p) => ({ ...p, descanso_segundos: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      placeholder="—"
                      title="Descanso después de terminar todo el bloque de cardio"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-slate-600">Metros (opcional)</label>
                    <input
                      type="number"
                      min={0}
                      value={cardioParams.metros_objetivo}
                      onChange={(e) => setCardioParams((p) => ({ ...p, metros_objetivo: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      placeholder="—"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-xs text-slate-600">Intensidad</label>
                  <input
                    type="text"
                    value={cardioParams.intensidad}
                    onChange={(e) => setCardioParams((p) => ({ ...p, intensidad: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    placeholder="FC 150-160 / Zona 2 / Alta / 75% FCmax..."
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-rose-700/70">
                  Para LISS: 1 serie + tiempo total. Para HIIT: varias series con intervalo. Para Tabata: 8 series x 20s + 10s.
                </p>
              </div>
            ) : (
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
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={isPending} className="flex-1">
                {isPending
                  ? 'Agregando...'
                  : esCardio
                    ? 'Agregar cardio'
                    : `Agregar ${selectedIds.size === 1 ? 'ejercicio' : `${selectedIds.size} ejercicios`}`}
              </Button>
            </div>
          </form>
        )}

        {selectedIds.size === 0 && (
          <p className="text-center text-sm text-slate-400">
            Seleccioná uno o más ejercicios de la lista
          </p>
        )}
      </div>
    </Modal>
  )
}
