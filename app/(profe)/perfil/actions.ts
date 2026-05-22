'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function actualizarPerfilProfe(data: {
  nombre: string
  apellido: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { error } = await (supabase.from('profiles') as any)
    .update({ nombre: data.nombre.trim(), apellido: data.apellido?.trim() || null })
    .eq('id', user.id)
    .eq('role', 'profe')

  if (error) return { error: 'Error al guardar.' }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return {}
}
