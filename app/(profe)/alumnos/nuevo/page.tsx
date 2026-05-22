'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Mail, User, CheckCircle2 } from 'lucide-react'
import { crearAlumno } from '../actions'

export default function NuevoAlumnoPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [emailCreado, setEmailCreado] = useState('')

  const [form, setForm] = useState({ nombre: '', apellido: '', email: '' })

  function handleChange(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('nombre', form.nombre)
      fd.append('apellido', form.apellido)
      fd.append('email', form.email)
      const result = await crearAlumno(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setEmailCreado(form.email)
        setExito(true)
      }
    })
  }

  if (exito) {
    return (
      <div className="px-4 py-6 md:p-8 max-w-lg">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">¡Alumno creado!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Se envió un email de invitación a <strong>{emailCreado}</strong>.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              El alumno tiene que hacer click en el link del email para activar su cuenta y elegir contraseña.
            </p>
          </div>

          <div className="w-full rounded-xl bg-blue-50 p-4 text-left text-sm text-blue-800 ring-1 ring-blue-100">
            <p className="font-semibold mb-1">📋 Instrucciones para el alumno:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700">
              <li>Buscá el email de invitación (revisá spam también)</li>
              <li>Hacé click en "Aceptar invitación"</li>
              <li>Creá tu contraseña</li>
              <li>Entrá a la app desde tu celular</li>
            </ol>
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={() => { setExito(false); setForm({ nombre: '', apellido: '', email: '' }) }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Agregar otro
            </button>
            <Link
              href="/alumnos"
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Ver alumnos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-lg">
      <Link
        href="/alumnos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a alumnos
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <UserPlus className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nuevo alumno</h1>
          <p className="text-xs text-slate-500">Se le enviará un email de invitación</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Datos personales</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Juan"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Apellido</label>
                <input
                  value={form.apellido}
                  onChange={(e) => handleChange('apellido', e.target.value)}
                  placeholder="Pérez"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="juan@ejemplo.com"
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-xs text-slate-400">
                El alumno recibirá un link para activar su cuenta en este email.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !form.nombre.trim() || !form.email.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {isPending ? 'Enviando invitación...' : 'Crear alumno y enviar invitación'}
        </button>
      </form>
    </div>
  )
}
