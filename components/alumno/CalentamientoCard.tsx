'use client'

import { useState } from 'react'
import { Flame, Clock, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  calentamiento: {
    id: string
    nombre: string
    descripcion: string | null
    duracion_minutos: number | null
    video_url: string | null
  }
}

export function CalentamientoCard({ calentamiento: c }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 ring-1 ring-orange-200">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-100/50 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-200 text-orange-700">
          <Flame className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Calentamiento
          </p>
          <p className="text-sm font-bold text-slate-900 truncate">{c.nombre}</p>
        </div>
        {c.duracion_minutos != null && (
          <span className="shrink-0 flex items-center gap-1 rounded-full bg-orange-200 px-2.5 py-1 text-xs font-bold text-orange-800">
            <Clock className="h-3 w-3" />
            {c.duracion_minutos} min
          </span>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-orange-600 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-orange-600 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-orange-200 bg-white/60 px-4 py-3 space-y-2">
          {c.descripcion && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {c.descripcion}
            </p>
          )}
          {c.video_url && (
            <a
              href={c.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors w-fit"
            >
              <PlayCircle className="h-4 w-4" />
              Ver video
            </a>
          )}
          {!c.descripcion && !c.video_url && (
            <p className="text-xs italic text-slate-500">Sin descripción adicional.</p>
          )}
        </div>
      )}
    </div>
  )
}
