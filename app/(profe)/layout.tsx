import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfeShell } from '@/components/profe/ProfeShell'

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

  return (
    <ProfeShell profile={profile!}>
      {children}
    </ProfeShell>
  )
}
