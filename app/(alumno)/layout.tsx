import { redirect } from 'next/navigation'
import { Dumbbell, LogOut, KeyRound, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { typed } from '@/lib/supabase/types-helper'
import { NavBottom } from '@/components/alumno/NavBottom'
import { NotifBell } from '@/components/alumno/NotifBell'
import { InstallPwaBtn } from '@/components/alumno/InstallPwaBtn'
import { EnablePushBtn } from '@/components/alumno/EnablePushBtn'
import { OfflineSync } from '@/components/alumno/OfflineSync'
import { TimerFAB } from '@/components/alumno/TimerFAB'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logout } from '@/app/(auth)/login/actions'
import type { Profile } from '@/lib/types/database'
import type { Notif } from '@/components/alumno/NotifBell'

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

  // Notificaciones iniciales
  const { data: notifData } = await (supabase.from('notificaciones' as any))
    .select('id, tipo, titulo, mensaje, leida, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15) as { data: Notif[] | null }

  const notifs: Notif[] = notifData ?? []
  const unreadCount = notifs.filter((n) => !n.leida).length

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
        <div className="flex items-center gap-2">
          <Link
            href="/perfil"
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            {profile?.nombre}
          </Link>
          <NotifBell
            userId={user.id}
            initialCount={unreadCount}
            initialNotifs={notifs}
          />
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

      {/* Banner clave temporal */}
      {profile?.password_changed === false && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800 leading-snug">
              Tu profe te generó una contraseña temporal. Cambiala para proteger tu cuenta.
            </p>
          </div>
          <Link
            href="/perfil"
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 transition-colors"
          >
            Cambiar ahora
          </Link>
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1 pb-20">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Nav inferior */}
      <NavBottom />

      {/* Temporizador flotante de descanso */}
      <TimerFAB />

      {/* Banner instalación PWA */}
      <InstallPwaBtn />

      {/* Banner activar push notifications */}
      <EnablePushBtn />

      {/* Sync offline */}
      <OfflineSync />
    </div>
  )
}
