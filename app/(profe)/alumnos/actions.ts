'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function suspenderAlumno(
  alumnoId: string,
  suspendido: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'profe') return { error: 'Sin permisos.' }

  const { error } = await (supabase.from('profiles') as any)
    .update({ suspendido })
    .eq('id', alumnoId)
    .eq('role', 'alumno')

  if (error) return { error: 'Error al actualizar.' }

  revalidatePath(`/alumnos/${alumnoId}`)
  revalidatePath(`/rutinas/${alumnoId}`)
  return {}
}

interface CrearAlumnoData {
  nombre: string
  apellido: string
  email: string
}

function generarPasswordTemporal(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `Rutina${num}`
}

export async function crearAlumno(
  formData: FormData
): Promise<{ error?: string; success?: boolean; tempPassword?: string; email?: string }> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const apellido = (formData.get('apellido') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!nombre || !email) {
    return { error: 'Nombre y email son obligatorios.' }
  }

  try {
    const supabase = createAdminClient()
    const tempPassword = generarPasswordTemporal()

    // Crear usuario directamente con contraseña temporal (sin email)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido: apellido || null,
        role: 'alumno',
      },
    })

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
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

    return { success: true, tempPassword, email }
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
