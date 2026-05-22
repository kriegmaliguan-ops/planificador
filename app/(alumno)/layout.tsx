import { redirect } from 'next/navigation'
import { Dumbbell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { NavBottom } from '@/components/alumno/NavBottom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logout } from '@/app/(auth)/login/actions'
import type { Profile } from '@/lib/types/database'

export default async function AlumnoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = typed<Profile>(
    await supabase.from('profiles').select('*').eq('id', user.id).single()
  )

  if (profile?.role !== 'alumno') redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Planificador Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">
            {profile?.nombre} {profile?.apellido ?? ''}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 pb-20">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Nav inferior */}
      <NavBottom />
    </div>
  )
}
