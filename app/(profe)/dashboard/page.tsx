import { Users, BookOpen, CalendarDays, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { typedList } from '@/lib/supabase/types-helper'
import type { Profile } from '@/lib/types/database'
import Link from 'next/link'

async function getStats() {
  const supabase = await createClient()

  const [alumnos, ejercicios, rutinas, registros] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'alumno'),
    supabase
      .from('ejercicios')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('rutinas')
      .select('*', { count: 'exact', head: true })
      .eq('activa', true),
    supabase
      .from('registros_progreso')
      .select('*', { count: 'exact', head: true }),
  ])

  return {
    totalAlumnos: alumnos.count ?? 0,
    totalEjercicios: ejercicios.count ?? 0,
    rutinasActivas: rutinas.count ?? 0,
    totalRegistros: registros.count ?? 0,
  }
}

async function getRecentAlumnos() {
  const supabase = await createClient()
  const result = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email, created_at')
    .eq('role', 'alumno')
    .order('created_at', { ascending: false })
    .limit(5)
  return typedList<Pick<Profile, 'id' | 'nombre' | 'apellido' | 'email' | 'created_at'>>(result).data
}

const STAT_CARDS = [
  {
    key: 'totalAlumnos',
    label: 'Alumnos',
    icon: Users,
    color: 'bg-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    href: '/alumnos',
  },
  {
    key: 'totalEjercicios',
    label: 'Ejercicios',
    icon: BookOpen,
    color: 'bg-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    href: '/ejercicios',
  },
  {
    key: 'rutinasActivas',
    label: 'Rutinas activas',
    icon: CalendarDays,
    color: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    href: '/rutinas',
  },
  {
    key: 'totalRegistros',
    label: 'Registros totales',
    icon: TrendingUp,
    color: 'bg-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    href: '/alumnos',
  },
] as const

export default async function DashboardPage() {
  const [stats, recentAlumnos] = await Promise.all([
    getStats(),
    getRecentAlumnos(),
  ])

  return (
    <div className="px-4 py-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen de tu academia
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
        {STAT_CARDS.map(({ key, label, icon: Icon, bg, text, href }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow"
          >
            <div className={`mb-4 inline-flex rounded-xl p-3 ${bg}`}>
              <Icon className={`h-6 w-6 ${text}`} />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {stats[key]}
            </p>
            <p className="mt-1 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
              {label}
            </p>
          </Link>
        ))}
      </div>

      {/* Alumnos recientes */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Alumnos recientes</h2>
          <Link
            href="/alumnos"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Ver todos
          </Link>
        </div>

        {recentAlumnos.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Todavía no hay alumnos.{' '}
            <Link href="/alumnos" className="text-blue-600 hover:underline">
              Agregá el primero
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentAlumnos.map((alumno) => (
              <li key={alumno.id}>
                <Link
                  href={`/alumnos/${alumno.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {alumno.nombre[0].toUpperCase()}
                    {alumno.apellido?.[0].toUpperCase() ?? ''}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {alumno.nombre} {alumno.apellido ?? ''}
                    </p>
                    <p className="truncate text-sm text-slate-500">{alumno.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(alumno.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
