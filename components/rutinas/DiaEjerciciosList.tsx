'use client'

import { useMemo } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { EjercicioDiaRow } from './EjercicioDiaRow'
import { MODALIDADES, type Modalidad } from '@/lib/modalidades'
import type { EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface Props {
  ejercicios: EjercicioEnDia[]
  diaId: string | null
  alumnoId: string
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<EjercicioEnDia>) => void
  onDesagrupar: (agrupacion: string, diaId: string) => void
}

// Agrupa los ejercicios consecutivos con la misma agrupacion en bloques.
function agruparPorAgrupacion(ejercicios: EjercicioEnDia[]) {
  const grupos: Array<
    | { type: 'single'; ejercicio: EjercicioEnDia }
    | { type: 'grupo'; modalidad: string; agrupacion: string; ejercicios: EjercicioEnDia[] }
  > = []
  let i = 0
  while (i < ejercicios.length) {
    const ej = ejercicios[i]
    if (ej.agrupacion && ej.modalidad !== 'normal') {
      // Buscar consecutivos con misma agrupacion + modalidad
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

export function DiaEjerciciosList({
  ejercicios, diaId, alumnoId, onMoveUp, onMoveDown, onRemove, onUpdate, onDesagrupar,
}: Props) {
  const grupos = useMemo(() => agruparPorAgrupacion(ejercicios), [ejercicios])

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

        // Grupo (biserie/superserie/triserie)
        const info = MODALIDADES[grupo.modalidad as Modalidad]
        const diaId = grupo.ejercicios[0]?.id ? '' : ''  // no usamos diaId directo, hacemos lookup
        return (
          <div
            key={`g-${grupo.agrupacion}-${gIdx}`}
            className={`rounded-2xl border-2 p-2 ${
              grupo.modalidad === 'biserie' ? 'border-purple-300 bg-purple-50/40'
              : grupo.modalidad === 'superserie' ? 'border-fuchsia-300 bg-fuchsia-50/40'
              : 'border-indigo-300 bg-indigo-50/40'
            }`}
          >
            {/* Header del grupo */}
            <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
              <div className="flex items-center gap-2">
                <Link2 className={`h-4 w-4 ${
                  grupo.modalidad === 'biserie' ? 'text-purple-600'
                  : grupo.modalidad === 'superserie' ? 'text-fuchsia-600'
                  : 'text-indigo-600'
                }`} />
                <span className={`text-xs font-bold uppercase tracking-wide ${
                  grupo.modalidad === 'biserie' ? 'text-purple-700'
                  : grupo.modalidad === 'superserie' ? 'text-fuchsia-700'
                  : 'text-indigo-700'
                }`}>
                  {info?.label ?? grupo.modalidad} · Grupo {grupo.agrupacion}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({grupo.ejercicios.length} ejercicios encadenados)
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
