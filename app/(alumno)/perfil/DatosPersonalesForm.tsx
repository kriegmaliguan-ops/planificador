'use client'

import { useState, useTransition } from 'react'
import { User, CheckCircle2, Phone, AtSign } from 'lucide-react'
import { actualizarDatosAlumno } from './actions'
import type { Profile } from '@/lib/types/database'

interface Props {
  profile: Pick<Profile, 'nombre' | 'apellido' | 'peso' | 'altura' | 'fecha_nacimiento' | 'objetivo' | 'instagram' | 'whatsapp'>
}

export function DatosPersonalesForm({ profile }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: profile.nombre ?? '',
    apellido: profile.apellido ?? '',
    peso: profile.peso?.toString() ?? '',
    altura: profile.altura?.toString() ?? '',
    fecha_nacimiento: profile.fecha_nacimiento ?? '',
    objetivo: profile.objetivo ?? '',
    instagram: profile.instagram ?? '',
    whatsapp: profile.whatsapp ?? '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setError(null)
    setDone(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await actualizarDatosAlumno({
        nombre: form.nombre,
        apellido: form.apellido,
        peso: form.peso ? parseFloat(form.peso) : null,
        altura: form.altura ? parseFloat(form.altura) : null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        objetivo: form.objetivo || null,
        instagram: form.instagram || null,
        whatsapp: form.whatsapp || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      }
    })
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <User className="h-4 w-4 text-slate-400" />
        <h2 className="font-semibold text-slate-900 text-sm">Mis datos</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Tu nombre"
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Apellido</label>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => set('apellido', e.target.value)}
              placeholder="Tu apellido"
              className={inputClass}
            />
          </div>
        </div>

        {/* Peso y Altura */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Peso (kg)</label>
            <input
              type="number"
              min={0}
              max={300}
              step={0.1}
              value={form.peso}
              onChange={(e) => set('peso', e.target.value)}
              placeholder="70"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Altura (cm)</label>
            <input
              type="number"
              min={0}
              max={250}
              step={1}
              value={form.altura}
              onChange={(e) => set('altura', e.target.value)}
              placeholder="170"
              className={inputClass}
            />
          </div>
        </div>

        {/* Fecha de nacimiento */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
          <input
            type="date"
            value={form.fecha_nacimiento}
            onChange={(e) => set('fecha_nacimiento', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Objetivo */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Objetivo</label>
          <textarea
            value={form.objetivo}
            onChange={(e) => set('objetivo', e.target.value)}
            placeholder="¿Qué querés lograr? Ej: ganar masa muscular, perder peso..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Contacto */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contacto (para que tu profe te escriba)
          </p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              WhatsApp
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">+</span>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="5491134567890"
                className={`${inputClass} pl-6`}
              />
            </div>
            <p className="text-[10px] text-slate-400">Con código de país (sin +).</p>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <AtSign className="h-3.5 w-3.5 text-slate-400" />
              Instagram
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => set('instagram', e.target.value)}
                placeholder="usuario"
                className={`${inputClass} pl-7`}
              />
            </div>
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
            ¡Datos guardados!
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
  )
}
