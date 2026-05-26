'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, User, Target, StickyNote } from 'lucide-react'
import { actualizarPerfilAlumno } from './actions'

interface PerfilFormProps {
  alumno: {
    id: string
    email: string
    nombre: string
    apellido: string | null
    peso: number | null
    altura: number | null
    fecha_nacimiento: string | null
    objetivo: string | null
    notas_profe: string | null
  }
}

export function PerfilForm({ alumno }: PerfilFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: alumno.nombre,
    apellido: alumno.apellido ?? '',
    peso: alumno.peso?.toString() ?? '',
    altura: alumno.altura?.toString() ?? '',
    fecha_nacimiento: alumno.fecha_nacimiento ?? '',
    objetivo: alumno.objetivo ?? '',
    notas_profe: alumno.notas_profe ?? '',
  })

  function handleChange(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await actualizarPerfilAlumno(alumno.id, {
        nombre: form.nombre,
        apellido: form.apellido || null,
        peso: form.peso ? Number(form.peso) : null,
        altura: form.altura ? Number(form.altura) : null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        objetivo: form.objetivo || null,
        notas_profe: form.notas_profe || null,
      })
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-2xl">
      <Link
        href={`/alumnos/${alumno.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al perfil
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Datos de {alumno.nombre}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos personales */}
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Datos personales</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre *" required>
                <input
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  required
                  className="input"
                />
              </Field>
              <Field label="Apellido">
                <input
                  value={form.apellido}
                  onChange={(e) => handleChange('apellido', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Email (no editable)">
              <input
                value={alumno.email}
                disabled
                className="input opacity-50 cursor-not-allowed"
              />
            </Field>

            <Field label="Fecha de nacimiento">
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Peso (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="300"
                  value={form.peso}
                  onChange={(e) => handleChange('peso', e.target.value)}
                  placeholder="Ej: 75.5"
                  className="input"
                />
              </Field>
              <Field label="Altura (cm)">
                <input
                  type="number"
                  min="0"
                  max="250"
                  value={form.altura}
                  onChange={(e) => handleChange('altura', e.target.value)}
                  placeholder="Ej: 175"
                  className="input"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Objetivo */}
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <Target className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Objetivo</h2>
          </div>
          <div className="px-6 py-5">
            <textarea
              value={form.objetivo}
              onChange={(e) => handleChange('objetivo', e.target.value)}
              rows={3}
              placeholder="Ej: Ganar masa muscular, perder peso, mejorar resistencia, preparar competencia..."
              className="input resize-none"
            />
          </div>
        </section>

        {/* Notas del profe */}
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <StickyNote className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Notas internas</h2>
            <span className="text-xs text-slate-400">(solo visible para el profe)</span>
          </div>
          <div className="px-6 py-5">
            <textarea
              value={form.notas_profe}
              onChange={(e) => handleChange('notas_profe', e.target.value)}
              rows={3}
              placeholder="Lesiones, restricciones, observaciones privadas..."
              className="input resize-none"
            />
          </div>
        </section>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          color: rgb(15 23 42);
        }
        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.2);
        }
      `}</style>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
