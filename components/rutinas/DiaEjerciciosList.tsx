'use client'

import { useMemo } from 'react'
import { Link2, Unlink, Plus, X } from 'lucide-react'
import { EjercicioDiaRow } from './EjercicioDiaRow'
import { MODALIDADES, type Modalidad } from '@/lib/modalidades'
import type { EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

export interface DraftGroup {
  id: string                  // 'draft-{ts}'
  modalidad: 'biserie' | 'superserie' | 'triserie'
  agrupacion: string          // A, B, C...
  slotsTotal: number          // 2 o 3
}

interface Props {
  ejercicios: EjercicioEnDia[]
  diaId: string | null
  alumnoId: string
  drafts: DraftGroup[]
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<EjercicioEnDia>) => void
  onDesagrupar: (agrupacion: string, diaId: string) => void
  onLlenarSlot: (modalidad: 'biserie' | 'superserie' | 'triserie', agrupacion: string) => void
  onCancelarDraft: (draftId: string) => void
}

// Agrupa ejercicios consecutivos con misma agrupacion+modalidad en bloques.
function agruparPorAgrupacion(ejercicios: EjercicioEnDia[]) {
  const grupos: Array<
    | { type: 'single'; ejercicio: EjercicioEnDia }
    | { type: 'grupo'; modalidad: string; agrupacion: string; ejercicios: EjercicioEnDia[] }
  > = []
  let i = 0
  while (i < ejercicios.length) {
    const ej = ejercicios[i]
    if (ej.agrupacion && ej.modalidad !== 'normal') {
      const grupo = [ej]
      let j = i + 1
      while (
        j < ejercicios.length &&
        ejercicios[j].agrupacion === ej.agrupacion &&
        ejercicios[j].modalidad === ej.modalidad
      ) {
        grupo.push(ejercicios[j])
        j++
      }
      grupos.push({
        type: 'grupo',
        modalidad: ej.modalidad,
        agrupacion: ej.agrupacion,
        ejercicios: grupo,
      })
      i = j
    } else {
      grupos.push({ type: 'single', ejercicio: ej })
      i++
    }
  }
  return grupos
}

function colorClasses(modalidad: string) {
  if (modalidad === 'biserie') return { border: 'border-purple-300', bg: 'bg-purple-50/40', text: 'text-purple-700', icon: 'text-purple-600' }
  if (modalidad === 'superserie') return { border: 'border-fuchsia-300', bg: 'bg-fuchsia-50/40', text: 'text-fuchsia-700', icon: 'text-fuchsia-600' }
  return { border: 'border-indigo-300', bg: 'bg-indigo-50/40', text: 'text-indigo-700', icon: 'text-indigo-600' }
}

export function DiaEjerciciosList({
  ejercicios, diaId, alumnoId, drafts, onMoveUp, onMoveDown, onRemove, onUpdate, onDesagrupar, onLlenarSlot, onCancelarDraft,
}: Props) {
  const grupos = useMemo(() => agruparPorAgrupacion(ejercicios), [ejercicios])

  // Drafts cuya agrupación ya tiene ejercicios reales se "promocionan" — los renderizamos como un grupo real con slots vacíos restantes
  // Los drafts SIN ejercicios reales aún se renderizan como caja vacía con N slots

  // Set de agrupaciones que tienen ejercicios reales (para saber si un draft ya tiene contenido)
  const agrupacionesConReales = new Set<string>()
  for (const ej of ejercicios) {
    if (ej.agrupacion && ej.modalidad !== 'normal') agrupacionesConReales.add(ej.agrupacion)
  }

  const draftsVacios = drafts.filter((d) => !agrupacionesConReales.has(d.agrupacion))

  // Para drafts donde YA hay ejercicios reales: insertar slots vacíos restantes dentro del grupo correspondiente
  const draftsConSlots = drafts.filter((d) => agrupacionesConReales.has(d.agrupacion))

  // Mapa id → posición global en el día (para isFirst/isLast)
  const posGlobal = new Map<string, number>()
  ejercicios.forEach((e, i) => posGlobal.set(e.id, i))

  return (
    <div className="space-y-2">
      {grupos.map((grupo, gIdx) => {
        if (grupo.type === 'single') {
          const idx = posGlobal.get(grupo.ejercicio.id) ?? 0
          return (
            <EjercicioDiaRow
              key={grupo.ejercicio.id}
              ejercicio={grupo.ejercicio}
              alumnoId={alumnoId}
              isFirst={idx === 0}
              isLast={idx === ejercicios.length - 1}
              onMoveUp={() => onMoveUp(grupo.ejercicio.id)}
              onMoveDown={() => onMoveDown(grupo.ejercicio.id)}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          )
        }

        // Grupo completo o parcial
        const info = MODALIDADES[grupo.modalidad as Modalidad]
        const colors = colorClasses(grupo.modalidad)
        // ¿Hay un draft activo para esta agrupacion? Si sí, agregamos slots vacíos extra.
        const draftPair = draftsConSlots.find((d) => d.agrupacion === grupo.agrupacion)
        const slotsRestantes = draftPair ? Math.max(0, draftPair.slotsTotal - grupo.ejercicios.length) : 0

        return (
          <div
            key={`g-${grupo.agrupacion}-${gIdx}`}
            className={`rounded-2xl border-2 p-2 ${colors.border} ${colors.bg}`}
          >
            {/* Header del grupo */}
            <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className={`h-4 w-4 shrink-0 ${colors.icon}`} />
                <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                  {info?.label ?? grupo.modalidad} {grupo.agrupacion}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  ({grupo.ejercicios.length}{draftPair ? `/${draftPair.slotsTotal}` : ''} ejercicio{grupo.ejercicios.length !== 1 ? 's' : ''})
                </span>
              </div>
              {diaId && (
                <button
                  onClick={() => onDesagrupar(grupo.agrupacion, diaId)}
                  title="Desagrupar"
                  className="rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Ejercicios del grupo */}
            <div className="space-y-2">
              {grupo.ejercicios.map((ej) => {
                const idx = posGlobal.get(ej.id) ?? 0
                return (
                  <EjercicioDiaRow
                    key={ej.id}
                    ejercicio={ej}
                    alumnoId={alumnoId}
                    isFirst={idx === 0}
                    isLast={idx === ejercicios.length - 1}
                    onMoveUp={() => onMoveUp(ej.id)}
                    onMoveDown={() => onMoveDown(ej.id)}
                    onRemove={onRemove}
                    onUpdate={onUpdate}
                  />
                )
              })}

              {/* Slots vacíos si hay un draft activo */}
              {slotsRestantes > 0 && Array.from({ length: slotsRestantes }).map((_, i) => (
                <button
                  key={`slot-${grupo.agrupacion}-${i}`}
                  onClick={() => onLlenarSlot(grupo.modalidad as any, grupo.agrupacion)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition-colors ${colors.border} ${colors.text} hover:bg-white`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ejercicio a {info?.label ?? grupo.modalidad} {grupo.agrupacion}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Drafts vacíos (sin ningún ejercicio real todavía) */}
      {draftsVacios.map((draft) => {
        const info = MODALIDADES[draft.modalidad as Modalidad]
        const colors = colorClasses(draft.modalidad)
        return (
          <div
            key={draft.id}
            className={`rounded-2xl border-2 p-2 ${colors.border} ${colors.bg}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className={`h-4 w-4 shrink-0 ${colors.icon}`} />
                <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                  {info?.label ?? draft.modalidad} {draft.agrupacion}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  (0/{draft.slotsTotal} ejercicios)
                </span>
              </div>
              <button
                onClick={() => onCancelarDraft(draft.id)}
                title="Cancelar"
                className="rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {Array.from({ length: draft.slotsTotal }).map((_, i) => (
                <button
                  key={`empty-${draft.id}-${i}`}
                  onClick={() => onLlenarSlot(draft.modalidad, draft.agrupacion)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition-colors ${colors.border} ${colors.text} hover:bg-white`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ejercicio a {info?.label ?? draft.modalidad} {draft.agrupacion}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
