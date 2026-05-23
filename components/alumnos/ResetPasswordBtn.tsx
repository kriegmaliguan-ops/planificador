'use client'

import { useState, useTransition } from 'react'
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { enviarResetContrasena } from '@/app/(profe)/alumnos/actions'

interface Props {
  alumnoId: string
  email: string
}

export function ResetPasswordBtn({ alumnoId, email }: Props) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await enviarResetContrasena(alumnoId)
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
        setTimeout(() => setSent(false), 6000)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Email enviado a {email}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <KeyRound className="h-4 w-4 text-slate-400" />
        {isPending ? 'Enviando...' : 'Enviar reset de contraseña'}
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
