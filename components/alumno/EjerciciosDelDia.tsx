'use client'

import { useMemo } from 'react'
import { Link2, Clock } from 'lucide-react'
import { EjercicioHoyCard, type EjercicioHoyData } from './EjercicioHoyCard'
import { MODALIDADES, type Modalidad } from '@/lib/modalidades'

interface Props {
  ejercicios: EjercicioHoyData[]
  fecha: string
}

function agruparPorAgrupacion(ejercicios: EjercicioHoyData[]) {
  const grupos: Array<
    | { type: 'single'; ejercicio: EjercicioHoyData; idx: number }
    | { type: 'grupo'; modalidad: string; agrupacion: string; items: Array<{ ejercicio: EjercicioHoyData; idx: number }> }
  > = []
  let i = 0
  while (i < ejercicios.length) {
    const ej = ejercicios[i]
    if (ej.agrupacion && ej.modalidad !== 'normal') {
      const items = [{ ejercicio: ej, idx: i }]
      let j = i + 1
      while (
        j < ejercicios.length &&
        ejercicios[j].agrupacion === ej.agrupacion &&
        ejercicios[j].modalidad === ej.modalidad
      ) {
        items.push({ ejercicio: ejercicios[j], idx: j })
        j++
      }
      grupos.push({ type: 'grupo', modalidad: ej.modalidad, agrupacion: ej.agrupacion, items })
      i = j
    } else {
      grupos.push({ type: 'single', ejercicio: ej, idx: i })
      i++
    }
  }
  return grupos
}

export function EjerciciosDelDia({ ejercicios, fecha }: Props) {
  const grupos = useMemo(() => agruparPorAgrupacion(ejercicios), [ejercicios])

  return (
    <>
      {grupos.map((grupo, gIdx) => {
        if (grupo.type === 'single') {
          return (
            <EjercicioHoyCard
              key={grupo.ejercicio.rutinaEjercicioId}
              ejercicio={grupo.ejercicio}
              index={grupo.idx}
              fecha={fecha}
            />
          )
        }

        const info = MODALIDADES[grupo.modalidad as Modalidad]
        const accent =
          grupo.modalidad === 'biserie' ? 'purple'
          : grupo.modalidad === 'superserie' ? 'fuchsia'
          : 'indigo'

        return (
          <div
            key={`g-${grupo.agrupacion}-${gIdx}`}
            className={`relative rounded-2xl border-2 p-2 ${
              accent === 'purple' ? 'border-purple-300 bg-purple-50/60'
              : accent === 'fuchsia' ? 'border-fuchsia-300 bg-fuchsia-50/60'
              : 'border-indigo-300 bg-indigo-50/60'
            }`}
          >
            {/* Header del grupo */}
            <div className="flex items-center gap-2 mb-2 px-2 py-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                accent === 'purple' ? 'bg-purple-200 text-purple-700'
                : accent === 'fuchsia' ? 'bg-fuchsia-200 text-fuchsia-700'
                : 'bg-indigo-200 text-indigo-700'
              }`}>
                <Link2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold uppercase tracking-wide ${
                  accent === 'purple' ? 'text-purple-800'
                  : accent === 'fuchsia' ? 'text-fuchsia-800'
                  : 'text-indigo-800'
                }`}>
                  {info?.label ?? grupo.modalidad} {grupo.agrupacion}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Hacé los {grupo.items.length} ejercicios <strong>seguidos sin descanso</strong>, después descansá.
                </p>
              </div>
              {/* Descanso del grupo: tomamos el del primer ejercicio (todos deberían tener el mismo) */}
              {grupo.items[0]?.ejercicio.descanso_segundos != null && (
                <div className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                  accent === 'purple' ? 'bg-purple-200 text-purple-800'
                  : accent === 'fuchsia' ? 'bg-fuchsia-200 text-fuchsia-800'
                  : 'bg-indigo-200 text-indigo-800'
                }`}>
                  <Clock className="h-3 w-3" />
                  {grupo.items[0].ejercicio.descanso_segundos}s
                </div>
              )}
            </div>

            {/* Ejercicios encadenados */}
            <div className="space-y-2">
              {grupo.items.map(({ ejercicio, idx }) => (
                <EjercicioHoyCard
                  key={ejercicio.rutinaEjercicioId}
                  ejercicio={ejercicio}
                  index={idx}
                  fecha={fecha}
                />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
