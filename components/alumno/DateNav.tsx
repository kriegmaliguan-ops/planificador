'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const DIAS_ES: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

interface DateNavProps {
  fecha: string   // YYYY-MM-DD
}

export function DateNav({ fecha }: DateNavProps) {
  const router = useRouter()
  const hoy = new Date().toISOString().split('T')[0]
  const esHoy = fecha === hoy

  function navegar(dias: number) {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + dias)
    const nueva = d.toISOString().split('T')[0]
    // No ir más allá de hoy
    if (nueva > hoy) return
    if (nueva === hoy) {
      router.push('/rutina')
    } else {
      router.push(`/rutina?fecha=${nueva}`)
    }
  }

  // Formato legible de la fecha
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const dateObj = new Date(anio, mes - 1, dia)
  const fechaLabel = dateObj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
      {/* Anterior */}
      <button
        onClick={() => navegar(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
        aria-label="Día anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Fecha actual */}
      <div className="flex flex-1 flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {esHoy ? (
            <span className="font-semibold text-blue-600">Hoy</span>
          ) : (
            <span>Sesión pasada</span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-900 capitalize">{fechaLabel}</p>
      </div>

      {/* Siguiente (solo si no es hoy) */}
      <button
        onClick={() => navegar(1)}
        disabled={esHoy}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Día siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
