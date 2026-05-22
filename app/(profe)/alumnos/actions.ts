'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

interface CrearAlumnoData {
  nombre: string
  apellido: string
  email: string
}

export async function crearAlumno(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const apellido = (formData.get('apellido') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!nombre || !email) {
    return { error: 'Nombre y email son obligatorios.' }
  }

  try {
    const supabase = createAdminClient()

    // Invitar al alumno por email — Supabase envía el link de activación
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido: apellido || null,
        role: 'alumno',
      },
      redirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      }/auth/callback?next=/auth/nueva-contrasena`,
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        return { error: 'Ya existe un usuario con ese email.' }
      }
      return { error: `Error al crear el alumno: ${error.message}` }
    }

    // El trigger handle_new_user crea el perfil automáticamente.
    // Si por algún motivo no se creó, lo creamos manualmente.
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({
          id: data.user.id,
          email,
          nombre,
          apellido: apellido || null,
          role: 'alumno',
        } as any)

      if (profileError) {
        console.error('Error creando perfil:', profileError)
      }
    }

    revalidatePath('/alumnos')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err) {
    console.error('crearAlumno error:', err)
    return { error: 'Error inesperado. Revisá que SUPABASE_SERVICE_ROLE_KEY esté configurada.' }
  }
}

export async function eliminarAlumno(alumnoId: string): Promise<{ error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.deleteUser(alumnoId)
    if (error) return { error: 'Error al eliminar el alumno.' }
    revalidatePath('/alumnos')
    revalidatePath('/dashboard')
  } catch (err) {
    console.error('eliminarAlumno error:', err)
    return { error: 'Error inesperado al eliminar.' }
  }
  redirect('/alumnos')
}
