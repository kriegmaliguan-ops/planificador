'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Send, Loader2, Check, X } from 'lucide-react'
import { enviarMensajeAProfe } from '@/app/(alumno)/mensajes/actions'

export function EnviarMensajeProfeBtn() {
  const [open, setOpen] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleEnviar() {
    if (!mensaje.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await enviarMensajeAProfe(mensaje.trim())
      if (result.error) { setError(result.error); return }
      setEnviado(true)
      setMensaje('')
      setTimeout(() => { setOpen(false); setEnviado(false) }, 1800)
    })
  }

  function close() {
    if (isPending) return
    setOpen(false)
    setMensaje('')
    setError(null)
    setEnviado(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Enviar mensaje a mi profe
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={close}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">Mensaje a tu profe</h3>
                <p className="text-xs text-slate-500">Le va a llegar como notificación.</p>
              </div>
              <button
                onClick={close}
                disabled={isPending || enviado}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              autoFocus
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Ej: Profe, hoy no pude entrenar bien porque me duele el hombro. ¿Podemos ajustar la rutina?"
              rows={5}
              maxLength={1000}
              disabled={isPending || enviado}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none disabled:bg-slate-50"
            />
            <div className="mt-1 flex justify-between text-[10px]">
              <span className="text-slate-400">{mensaje.length}/1000</span>
            </div>

            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <div className="mt-3 flex gap-2">
              <button
                onClick={close}
                disabled={isPending || enviado}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                disabled={isPending || !mensaje.trim() || enviado}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors ${
                  enviado ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : enviado ? (
                  <>
                    <Check className="h-4 w-4" />
                    ¡Enviado!
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
