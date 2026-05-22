'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Lock, CheckCircle2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PerfilAlumnoPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, startLogout] = useTransition()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
        setError('No se pudo cambiar la contraseña. Intentá de nuevo.')
      } else {
        setDone(true)
        setPassword('')
        setConfirm('')
        setTimeout(() => setDone(false), 3000)
      }
    })
  }

  function handleLogout() {
    startLogout(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    })
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Mi cuenta</h1>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden mb-4">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Lock className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">Cambiar contraseña</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Nueva contraseña */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Repetir contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                placeholder="Repetí la contraseña"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </p>
          )}

          {done && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              ¡Contraseña actualizada!
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || password.length < 6}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/50 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {isLoggingOut ? 'Saliendo...' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
