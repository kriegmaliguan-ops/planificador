'use client'

import { useState, useTransition } from 'react'
import { Megaphone, Send, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { enviarNotificacion } from '@/app/(profe)/alumnos/[id]/actions'

interface Props {
  alumnoId: string
  alumnoNombre: string
}

const MENSAJES_RAPIDOS = [
  '¡Excelente trabajo esta semana! 💪',
  'Recordá hidratarte bien antes de entrenar.',
  'Revisá la rutina actualizada.',
  '¡Seguí así, vas muy bien!',
]

export function EnviarNotifBtn({ alumnoId, alumnoNombre }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEnviar() {
    if (!titulo.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await enviarNotificacion(alumnoId, titulo, mensaje)
      if (result.error) {
        setError(result.error)
      } else {
        setEnviado(true)
        setTitulo('')
        setMensaje('')
        setTimeout(() => {
          setEnviado(false)
          setAbierto(false)
        }, 1800)
      }
    })
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2"
      >
        <Megaphone className="h-4 w-4 text-slate-400" />
        <p className="flex-1 text-left text-sm font-semibold text-slate-900">
          Enviar mensaje a {alumnoNombre}
        </p>
        {abierto
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />
        }
      </button>

      {abierto && (
        <div className="mt-4 space-y-3">
          {/* Mensajes rápidos */}
          <div className="flex flex-wrap gap-1.5">
            {MENSAJES_RAPIDOS.map((m) => (
              <button
                key={m}
                onClick={() => { setTitulo(m); setMensaje('') }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  titulo === m
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Título (obligatorio) */}
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título del mensaje *"
            maxLength={120}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

          {/* Cuerpo (opcional) */}
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Detalles adicionales (opcional)..."
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleEnviar}
            disabled={isPending || !titulo.trim() || enviado}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              enviado
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {enviado ? (
              <>
                <Check className="h-4 w-4" />
                Enviado
              </>
            ) : isPending ? (
              'Enviando...'
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar notificación
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
