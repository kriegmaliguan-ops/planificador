import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { logout } from '@/app/(auth)/login/actions'
import { DatosPersonalesForm } from './DatosPersonalesForm'
import { CambiarPasswordForm } from './CambiarPasswordForm'
import { EnviarMensajeProfeBtn } from '@/components/alumno/EnviarMensajeProfeBtn'
import type { Profile } from '@/lib/types/database'

export default async function PerfilAlumnoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('*').eq('id', user.id).single()
  )
  if (!profile) redirect('/login')

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Mi cuenta</h1>

      {/* Datos personales */}
      <DatosPersonalesForm profile={profile} />

      {/* Enviar mensaje al profe */}
      <EnviarMensajeProfeBtn />

      {/* Cambiar contraseña */}
      <CambiarPasswordForm />

      {/* Cerrar sesión */}
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/50 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
