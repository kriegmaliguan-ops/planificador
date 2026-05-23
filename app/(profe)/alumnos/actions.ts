'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { crearNotificacion } from '@/lib/notificaciones'

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

  // Notificar al alumno cuando se reactiva el plan
  if (!suspendido) {
    await crearNotificacion(
      alumnoId,
      'plan_reactivado',
      '¡Tu plan fue reactivado!',
      'Ya podés volver a ver y registrar tu rutina.'
    )
  }

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

    // Notificación de bienvenida
    if (data.user) {
      await crearNotificacion(
        data.user.id,
        'bienvenida',
        `¡Bienvenido/a, ${nombre}!`,
        'Tu profe te creó una cuenta. La primera vez que entres te pedirá que cambies tu contraseña.'
      )
    }

    revalidatePath('/alumnos')
    revalidatePath('/dashboard')

    return { success: true, tempPassword, email }
  } catch (err) {
    console.error('crearAlumno error:', err)
    return { error: 'Error inesperado. Revisá que SUPABASE_SERVICE_ROLE_KEY esté configurada.' }
  }
}

export async function enviarResetContrasena(
  alumnoId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Solo profes
  const { data: profe } = await supabase
    .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (profe?.role !== 'profe') return { error: 'Sin permisos.' }

  // Obtener email del alumno via admin
  const admin = createAdminClient()
  const { data: alumnoData, error: userError } = await admin.auth.admin.getUserById(alumnoId)
  if (userError || !alumnoData.user?.email) return { error: 'No se encontró el alumno.' }

  // Usar cliente anónimo para resetPasswordForEmail (evita conflictos con el server client SSR)
  const { createClient: createSupabaseJs } = await import('@supabase/supabase-js')
  const anonClient = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://planificador-virid.vercel.app'}/auth/callback?next=/auth/nueva-contrasena`
  const { error } = await anonClient.auth.resetPasswordForEmail(alumnoData.user.email, { redirectTo })
  if (error) {
    console.error('resetPasswordForEmail error:', error.message)
    return { error: 'No se pudo enviar el email. Intentá de nuevo.' }
  }

  return {}
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
