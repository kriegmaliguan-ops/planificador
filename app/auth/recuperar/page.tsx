'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Dumbbell, Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/nueva-contrasena`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        setError('No se pudo enviar el email. Verificá que sea correcto.')
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">¡Email enviado!</h2>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            Revisá tu bandeja de entrada y hacé click en el link para cambiar tu contraseña.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-blue-400 hover:underline">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-slate-400">Te enviamos un link a tu email</p>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="nombre@ejemplo.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/20 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>
        </div>

        <Link
          href="/login"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </Link>
      </div>
    </div>
  )
}
