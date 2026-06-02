'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { offlineWrite } from '@/lib/offline-write'

interface EjercicioInfo {
  rutinaEjercicioId: string
  series: number
  repeticiones: string
  registrado: boolean
}

interface RegistrarTodoBtnProps {
  ejercicios: EjercicioInfo[]
  fecha: string
}

export function RegistrarTodoBtn({ ejercicios, fecha }: RegistrarTodoBtnProps) {
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<string | null>(null)

  const pendientes = ejercicios.filter((e) => !e.registrado)

  // Si todos ya están registrados, no mostrar nada
  if (pendientes.length === 0) return null

  function handleClick() {
    setMensaje(null)
    startTransition(async () => {
      const result = await offlineWrite('registrarTodoDia', {
        ejercicios: ejercicios.map((e) => ({
          rutinaEjercicioId: e.rutinaEjercicioId,
          series: e.series,
          repeticiones: e.repeticiones,
        })),
        fecha,
      })
      if (!result.ok) {
        setMensaje(result.error ?? 'Error al guardar')
      } else if (result.queued) {
        setMensaje('Guardado offline. Se sincronizará al volver la conexión.')
      } else {
        setMensaje(`${pendientes.length} ejercicio${pendientes.length === 1 ? '' : 's'} registrado${pendientes.length === 1 ? '' : 's'}.`)
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {isPending ? 'Registrando...' : `Registrar todo (${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'})`}
      </button>
      {mensaje && (
        <p className="text-xs text-slate-400">{mensaje}</p>
      )}
    </div>
  )
}
