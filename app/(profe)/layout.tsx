import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfeShell } from '@/components/profe/ProfeShell'
import type { Notif } from '@/components/alumno/NotifBell'

export default async function ProfeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: import('@/lib/types/database').Profile | null; error: unknown }

  if (profile?.role !== 'profe') redirect('/rutina')

  // Notificaciones del profe (mensajes de alumnos, etc)
  const { data: notifData } = await (supabase.from('notificaciones' as any))
    .select('id, tipo, titulo, mensaje, leida, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15) as { data: Notif[] | null }

  const notifs: Notif[] = notifData ?? []
  const unreadCount = notifs.filter((n) => !n.leida).length

  return (
    <ProfeShell
      profile={profile!}
      userId={user.id}
      initialNotifs={notifs}
      unreadCount={unreadCount}
    >
      {children}
    </ProfeShell>
  )
}
