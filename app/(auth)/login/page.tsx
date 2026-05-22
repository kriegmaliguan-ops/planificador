'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { Dumbbell, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { login } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Planificador Pro</h1>
          <p className="mt-1 text-sm text-slate-400">Ingresá con tu cuenta</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/10 p-8 shadow-xl backdrop-blur-sm ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              loading={isPending}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {isPending ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿Olvidaste tu contraseña?{' '}
          <Link href="/auth/recuperar" className="text-blue-400 hover:underline">
            Recuperar acceso
          </Link>
        </p>
      </div>
    </div>
  )
}
