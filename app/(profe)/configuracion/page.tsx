import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PerfilProfeForm } from './PerfilProfeForm'
import type { Profile } from '@/lib/types/database'

export default async function PerfilProfePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Mi perfil</h1>
      <PerfilProfeForm profile={profile} />
    </div>
  )
}
