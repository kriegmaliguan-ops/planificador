'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function marcarTodasLeidas(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase.from('notificaciones' as any))
    .update({ leida: true })
    .eq('user_id', user.id)
    .eq('leida', false)
  revalidatePath('/rutina')
}
