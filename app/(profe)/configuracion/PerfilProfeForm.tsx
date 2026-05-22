'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Lock, CheckCircle2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { actualizarPerfilProfe } from './actions'
import type { Profile } from '@/lib/types/database'

export function PerfilProfeForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition()
  const [isPassPending, startPassTransition] = useTransition()

  // Datos personales
  const [nombre, setNombre] = useState(profile.nombre ?? '')
  const [apellido, setApellido] = useState(profile.apellido ?? '')
  const [savedDatos, setSavedDatos] = useState(false)
  const [errorDatos, setErrorDatos] = useState<string | null>(null)

  // Contraseña
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savedPass, setSavedPass] = useState(false)
  const [errorPass, setErrorPass] = useState<string | null>(null)

  function handleDatos(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setErrorDatos('El nombre es obligatorio.'); return }
    setErrorDatos(null)
    startTransition(async () => {
      const res = await actualizarPerfilProfe({ nombre, apellido: apellido || null })
      if (res.error) { setErrorDatos(res.error); return }
      setSavedDatos(true)
      setTimeout(() => setSavedDatos(false), 3000)
    })
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setErrorPass('Mínimo 6 caracteres.'); return }
    if (password !== confirm) { setErrorPass('Las contraseñas no coinciden.'); return }
    setErrorPass(null)
    startPassTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setErrorPass('No se pudo cambiar. Intentá de nuevo.'); return }
      setSavedPass(true)
      setPassword('')
      setConfirm('')
      setTimeout(() => setSavedPass(false), 3000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Datos personales */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <User className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">Datos personales</h2>
        </div>
        <form onSubmit={handleDatos} className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Nombre *</label>
              <input
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setErrorDatos(null) }}
                placeholder="Tu nombre"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Apellido</label>
              <input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Tu apellido"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              value={profile.email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
            />
          </div>

          {errorDatos && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600 ring-1 ring-red-200">{errorDatos}</p>
          )}
          {savedDatos && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> ¡Guardado!
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Guardando...' : 'Guardar datos'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Lock className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handlePassword} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorPass(null) }}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Repetir contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrorPass(null) }}
                placeholder="Repetí la contraseña"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {errorPass && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600 ring-1 ring-red-200">{errorPass}</p>
          )}
          {savedPass && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> ¡Contraseña actualizada!
            </div>
          )}

          <button
            type="submit"
            disabled={isPassPending || password.length < 6}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isPassPending ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
