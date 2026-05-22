'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, CheckCircle2, Eye, EyeOff, Dumbbell } from 'lucide-react'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('Error al guardar. Intentá de nuevo o pedile al profe que te reenvíe la invitación.')
        return
      }
      // Marcar contraseña como cambiada
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await (supabase.from('profiles') as any)
          .update({ password_changed: true })
          .eq('id', user.id)
      }
      setDone(true)
      setTimeout(() => router.push('/rutina'), 2500)
    })
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">¡Contraseña guardada!</h2>
          <p className="mt-2 text-sm text-slate-400">Entrando a tu rutina...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">¡Bienvenido!</h1>
          <p className="mt-1 text-sm text-slate-400">
            Creá tu contraseña para acceder siempre a tu rutina
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-200">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-200">
                Repetir contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                  placeholder="Repetí la contraseña"
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
              disabled={isPending || password.length < 6}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando...' : 'Crear contraseña y entrar'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Usá esta contraseña cada vez que quieras entrar a tu rutina.
        </p>
      </div>
    </div>
  )
}
