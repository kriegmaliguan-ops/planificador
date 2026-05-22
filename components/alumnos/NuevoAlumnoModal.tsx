'use client'

import { useTransition, useState } from 'react'
import { UserPlus, CheckCircle2, Copy, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { crearAlumno } from '@/app/(profe)/alumnos/actions'

interface NuevoAlumnoModalProps {
  open: boolean
  onClose: () => void
}

export function NuevoAlumnoModal({ open, onClose }: NuevoAlumnoModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await crearAlumno(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.tempPassword && result.email) {
        setResultado({ email: result.email, tempPassword: result.tempPassword })
      }
    })
  }

  function handleClose() {
    setError(null)
    setResultado(null)
    onClose()
  }

  async function copiar(texto: string, tipo: 'email' | 'pass') {
    await navigator.clipboard.writeText(texto)
    if (tipo === 'email') {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } else {
      setCopiedPass(true)
      setTimeout(() => setCopiedPass(false), 2000)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Agregar alumno" className="max-w-md">
      {resultado ? (
        /* Estado success — mostrar credenciales */
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">¡Alumno creado!</p>
              <p className="text-xs text-slate-500">Compartí estos datos con tu alumno</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{resultado.email}</p>
            </div>
            <button
              onClick={() => copiar(resultado.email, 'email')}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-colors"
            >
              {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedEmail ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Contraseña */}
          <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-400">Contraseña temporal</p>
              <p className="mt-0.5 text-lg font-bold tracking-wider text-blue-700">{resultado.tempPassword}</p>
            </div>
            <button
              onClick={() => copiar(resultado.tempPassword, 'pass')}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50 transition-colors"
            >
              {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedPass ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Hola! Te comparto tus datos de acceso:\n\n🌐 App: https://planificador-virid.vercel.app\n📧 Email: ${resultado.email}\n🔑 Contraseña: ${resultado.tempPassword}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white hover:bg-[#20bd5a] transition-colors"
          >
            <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar por WhatsApp
          </a>

          <p className="text-center text-xs text-slate-400">
            El alumno puede cambiar su contraseña desde su perfil.
          </p>

          <Button onClick={handleClose} variant="secondary" className="w-full">
            Cerrar
          </Button>
        </div>
      ) : (
        /* Formulario */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="nombre" className="block text-sm font-medium text-slate-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                placeholder="Juan"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="apellido" className="block text-sm font-medium text-slate-700">
                Apellido
              </label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                placeholder="Pérez"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="alumno@ejemplo.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="flex-1 gap-2">
              <UserPlus className="h-4 w-4" />
              {isPending ? 'Creando...' : 'Crear alumno'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
