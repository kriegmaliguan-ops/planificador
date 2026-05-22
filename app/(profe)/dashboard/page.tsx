import { Users, BookOpen, CalendarDays, TrendingUp, PauseCircle, Dumbbell, CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHoyChile } from '@/lib/utils'
import Link from 'next/link'

function getLunes(hoy: string): string {
  const [y, m, d] = hoy.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  const diff = jsDay === 0 ? -6 : -(jsDay - 1)
  const date = new Date(y, m - 1, d + diff)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function getDashboardData() {
  const supabase = await createClient()
  const hoy = getHoyChile()
  const lunes = getLunes(hoy)

  const [alumnosRes, ejerciciosRes, rutinasRes, registrosSemanaRes] = await Promise.all([
    supabase.from('profiles').select('id, nombre, apellido, email, suspendido, created_at').eq('role', 'alumno').order('nombre'),
    supabase.from('ejercicios').select('*', { count: 'exact', head: true }),
    supabase.from('rutinas').select('*', { count: 'exact', head: true }).eq('activa', true),
    supabase.from('registros_progreso').select('alumno_id, fecha').gte('fecha', lunes).lte('fecha', hoy),
  ])

  const alumnos = (alumnosRes.data ?? []) as {
    id: string; nombre: string; apellido: string | null
    email: string; suspendido: boolean | null; created_at: string
  }[]

  const registrosSemana = registrosSemanaRes.data ?? []
  const alumnosQueEntrenaron = new Set(registrosSemana.map(r => r.alumno_id))

  const activos = alumnos.filter(a => !a.suspendido)
  const suspendidos = alumnos.filter(a => a.suspendido)
  const entrenarOnCount = activos.filter(a => alumnosQueEntrenaron.has(a.id)).length
  const sinEntrenarCount = activos.filter(a => !alumnosQueEntrenaron.has(a.id)).length

  return {
    totalAlumnos: alumnos.length,
    activos: activos.length,
    suspendidos: suspendidos.length,
    totalEjercicios: ejerciciosRes.count ?? 0,
    rutinasActivas: rutinasRes.count ?? 0,
    entrenarOnCount,
    sinEntrenarCount,
    alumnos,
    alumnosQueEntrenaron,
    lunes,
    hoy,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen de tu academia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Link href="/alumnos" className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2.5">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.activos}</p>
          <p className="mt-0.5 text-sm text-slate-500">Alumnos activos</p>
        </Link>

        <Link href="/alumnos?filtro=suspendidos" className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-3 inline-flex rounded-xl bg-amber-50 p-2.5">
            <PauseCircle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.suspendidos}</p>
          <p className="mt-0.5 text-sm text-slate-500">Suspendidos</p>
        </Link>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.entrenarOnCount}</p>
          <p className="mt-0.5 text-sm text-slate-500">Entrenaron esta semana</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 inline-flex rounded-xl bg-orange-50 p-2.5">
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.sinEntrenarCount}</p>
          <p className="mt-0.5 text-sm text-slate-500">Sin entrenar esta semana</p>
        </div>
      </div>

      {/* Actividad semanal */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Actividad esta semana</h2>
            <p className="text-xs text-slate-400 mt-0.5">Lunes {data.lunes} → hoy</p>
          </div>
          <Link href="/alumnos" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Ver todos
          </Link>
        </div>

        {data.alumnos.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Todavía no hay alumnos.{' '}
            <Link href="/alumnos" className="text-blue-600 hover:underline">Agregá el primero</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {data.alumnos.map((alumno) => {
              const suspendido = !!alumno.suspendido
              const entrenó = data.alumnosQueEntrenaron.has(alumno.id)
              return (
                <li key={alumno.id}>
                  <Link
                    href={`/alumnos/${alumno.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      suspendido ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {alumno.nombre[0].toUpperCase()}{alumno.apellido?.[0].toUpperCase() ?? ''}
                    </div>

                    {/* Nombre */}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${suspendido ? 'text-slate-400' : 'text-slate-900'}`}>
                        {alumno.nombre} {alumno.apellido ?? ''}
                      </p>
                    </div>

                    {/* Estado */}
                    {suspendido ? (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <PauseCircle className="h-3 w-3" />
                        Suspendido
                      </span>
                    ) : entrenó ? (
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Entrenó
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        Sin actividad
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/ejercicios" className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <BookOpen className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.totalEjercicios}</p>
            <p className="text-sm text-slate-500">Ejercicios en la biblioteca</p>
          </div>
        </Link>

        <Link href="/alumnos" className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.rutinasActivas}</p>
            <p className="text-sm text-slate-500">Rutinas activas</p>
          </div>
        </Link>
      </div>

    </div>
  )
}
