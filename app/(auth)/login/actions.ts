'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Completá todos los campos.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Debés confirmar tu email antes de ingresar.' }
    }
    return { error: 'Ocurrió un error. Intentá de nuevo.' }
  }

  // Obtener rol para redirigir al área correcta
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single() as { data: { role: string } | null; error: unknown }

  redirect(profile?.role === 'profe' ? '/dashboard' : '/rutina')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
