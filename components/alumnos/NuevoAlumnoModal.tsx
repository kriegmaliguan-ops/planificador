'use client'

import { useTransition, useState } from 'react'
import { UserPlus, CheckCircle2 } from 'lucide-react'
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
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    startTransition(async () => {
      const result = await crearAlumno(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setInvitedEmail(email)
      }
    })
  }

  function handleClose() {
    setError(null)
    setInvitedEmail(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Agregar alumno" className="max-w-md">
      {invitedEmail ? (
        /* Estado success */
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">¡Invitación enviada!</p>
            <p className="mt-1 text-sm text-slate-500">
              Se envió un email de activación a{' '}
              <span className="font-medium text-slate-700">{invitedEmail}</span>.
              El alumno deberá hacer clic en el link para crear su contraseña.
            </p>
          </div>
          <Button onClick={handleClose} className="mt-2 w-full">
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
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isPending}
              className="flex-1 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isPending ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
