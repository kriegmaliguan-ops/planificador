'use client'

import { useTransition } from 'react'
import { PauseCircle, PlayCircle } from 'lucide-react'
import { suspenderAlumno } from '@/app/(profe)/alumnos/actions'

interface Props {
  alumnoId: string
  suspendido: boolean
}

export function SuspenderAlumnoBtn({ alumnoId, suspendido }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await suspenderAlumno(alumnoId, !suspendido)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        suspendido
          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          : 'border-amber-200 text-amber-700 hover:bg-amber-50'
      }`}
    >
      {suspendido ? (
        <><PlayCircle className="h-4 w-4" />{isPending ? 'Reactivando...' : 'Reactivar alumno'}</>
      ) : (
        <><PauseCircle className="h-4 w-4" />{isPending ? 'Suspendiendo...' : 'Suspender alumno'}</>
      )}
    </button>
  )
}
