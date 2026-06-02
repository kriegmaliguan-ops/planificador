import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, CalendarDays, Dumbbell, ChevronRight, TrendingUp, User, KeyRound, StickyNote, Phone, AtSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typed, typedList } from '@/lib/supabase/types-helper'
import { EliminarAlumnoBtn } from '@/components/alumnos/EliminarAlumnoBtn'
import { SuspenderAlumnoBtn } from '@/components/alumnos/SuspenderAlumnoBtn'
import { ResetPasswordBtn } from '@/components/alumnos/ResetPasswordBtn'
import { EnviarNotifBtn } from '@/components/alumnos/EnviarNotifBtn'
import type { Profile, Rutina } from '@/lib/types/database'

interface Props {
  params: Promise<{ id: string }>
}

async function getAlumnoData(id: string) {
  const supabase = await createClient()

  const [profileResult, rutinasResult] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('id, email, nombre, apellido, avatar_url, role, peso, altura, fecha_nacimiento, objetivo, notas_profe, suspendido, password_changed, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'alumno')
      .single(),
    supabase
      .from('rutinas')
      .select('id, nombre, activa, fecha_inicio, fecha_fin, created_at')
      .eq('alumno_id', id)
      .order('activa', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return {
    profile: profileResult.status === 'fulfilled' ? typed<Profile>(profileResult.value).data : null,
    rutinas: rutinasResult.status === 'fulfilled'
      ? typedList<Pick<Rutina, 'id' | 'nombre' | 'activa' | 'fecha_inicio' | 'fecha_fin' | 'created_at'>>(rutinasResult.value).data
      : [],
  }
}

export default async function AlumnoPerfilPage({ params }: Props) {
  const { id } = await params
  const { profile, rutinas } = await getAlumnoData(id)

  if (!profile) notFound()

  const initials = [profile.nombre, profile.apellido]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('')

  const rutinaActiva = rutinas.find((r) => r.activa)

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/alumnos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a alumnos
      </Link>

      {/* Header del alumno */}
      <div className="mb-8 rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl sm:text-2xl font-bold text-blue-700">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {profile.nombre} {profile.apellido ?? ''}
            </h1>
            <div className="mt-1.5 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5 text-xs sm:text-sm truncate">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                Desde{' '}
                {new Date(profile.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {profile.suspendido && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Suspendido
                </span>
              )}
              {profile.password_changed === false && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  <KeyRound className="h-3 w-3" />
                  Clave sin cambiar
                </span>
              )}
              {rutinaActiva && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[140px]">Rutina: {rutinaActiva.nombre}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {profile.whatsapp && (
            <a
              href={`https://wa.me/${profile.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
              title="Abrir chat de WhatsApp"
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {profile.instagram && (
            <a
              href={`https://instagram.com/${profile.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              title="Abrir Instagram"
            >
              <AtSign className="h-4 w-4" />
              Instagram
            </a>
          )}
          <Link
            href={`/rutinas/${id}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {rutinaActiva ? 'Editar rutina' : 'Crear rutina'}
          </Link>
        </div>
      </div>

      {/* Notas privadas del profe — solo si existen */}
      {profile.notas_profe && profile.notas_profe.trim() && (
        <Link
          href={`/alumnos/${id}/perfil`}
          className="mb-6 block rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 hover:ring-amber-300 transition-shadow group"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
              <StickyNote className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-900 mb-0.5">
                Notas privadas <span className="font-normal opacity-70">(solo vos las ves)</span>
              </p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-snug">
                {profile.notas_profe}
              </p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-amber-400 group-hover:text-amber-600 transition-colors mt-1" />
          </div>
        </Link>
      )}

      {/* Navegación rápida */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/alumnos/${id}/perfil`}
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:ring-blue-200 hover:shadow-md transition-all group"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-200 transition-colors">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm">Datos del alumno</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile.peso ? `${profile.peso} kg` : '—'}{' '}
              {profile.altura ? `· ${profile.altura} cm` : ''}
            </p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </Link>

        <Link
          href={`/alumnos/${id}/progreso`}
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:ring-blue-200 hover:shadow-md transition-all group"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm">Progreso</p>
            <p className="text-xs text-slate-400 mt-0.5">Historial de entrenamientos</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </Link>
      </div>

      {/* Rutinas */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">
            Rutinas{' '}
            <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {rutinas.length}
            </span>
          </h2>
          <Link
            href={`/rutinas/${id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Nueva rutina
          </Link>
        </div>

        {rutinas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Dumbbell className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Este alumno no tiene rutinas aún.</p>
            <Link
              href={`/rutinas/${id}`}
              className="mt-1 text-sm font-medium text-blue-600 hover:underline"
            >
              Crear primera rutina
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rutinas.map((rutina) => (
              <li key={rutina.id}>
                <Link
                  href={`/rutinas/${id}?rutina=${rutina.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{rutina.nombre}</p>
                      {rutina.activa && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Activa
                        </span>
                      )}
                    </div>
                    {(rutina.fecha_inicio || rutina.fecha_fin) && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {rutina.fecha_inicio
                          ? new Date(rutina.fecha_inicio).toLocaleDateString('es-AR')
                          : '—'}{' '}
                        →{' '}
                        {rutina.fecha_fin
                          ? new Date(rutina.fecha_fin).toLocaleDateString('es-AR')
                          : 'sin fecha'}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Enviar notificación */}
      <EnviarNotifBtn
        alumnoId={id}
        alumnoNombre={profile.nombre}
      />

      {/* Acceso y contraseña */}
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Acceso</p>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Mandá un email al alumno para que cambie su contraseña. El link expira en 1 hora.
        </p>
        <ResetPasswordBtn alumnoId={id} />
      </div>

      {/* Zona de peligro */}
      <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/50 p-5">
        <p className="mb-3 text-sm font-semibold text-red-700">Zona de peligro</p>
        <div className="flex flex-wrap gap-3">
          <SuspenderAlumnoBtn alumnoId={id} suspendido={profile.suspendido ?? false} />
          <EliminarAlumnoBtn
            alumnoId={id}
            nombre={`${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}`}
          />
        </div>
      </div>
    </div>
  )
}
