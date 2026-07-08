import { Users, BookOpen, CalendarDays, TrendingUp, PauseCircle, Dumbbell, CheckCircle2, Clock, AlertTriangle, Flame, Gauge, Moon } from 'lucide-react'
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

function diasEntre(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split('-').map(Number)
  const [y2, m2, d2] = hasta.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

interface AlumnoMetrica {
  id: string
  nombre: string
  apellido: string | null
  suspendido: boolean
  rutinaActiva: boolean
  diasEntrenadosSemana: number  // días distintos con registro en lunes..hoy
  diasPrevistosSemana: number   // días de rutina (no descanso) en la semana actual
  diasSinEntrenar: number       // días desde último registro
  ultimoRegistro: string | null
  adherenciaSemana: number | null  // % (entrenados / previstos) si previstos > 0
  rpePromSemana: number | null     // promedio de RPE registrado esta semana
  suenoPromSemana: number | null   // promedio de sueño (1-7) esta semana
}

async function getDashboardData() {
  const supabase = await createClient()
  const hoy = getHoyChile()
  const lunes = getLunes(hoy)
  const hace30Dias = (() => {
    const [y, m, d] = hoy.split('-').map(Number)
    const date = new Date(y, m - 1, d - 30)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })()

  const [alumnosRes, ejerciciosRes, rutinasActivasCountRes, registrosSemanaRes, registrosMesRes, rutinasConDiasRes, bienestarSemanaRes] = await Promise.all([
    supabase.from('profiles').select('id, nombre, apellido, email, suspendido, created_at').eq('role', 'alumno').order('nombre'),
    supabase.from('ejercicios').select('*', { count: 'exact', head: true }),
    supabase.from('rutinas').select('*', { count: 'exact', head: true }).eq('activa', true),
    supabase.from('registros_progreso').select('alumno_id, fecha, rpe').gte('fecha', lunes).lte('fecha', hoy),
    supabase.from('registros_progreso').select('alumno_id, fecha').gte('fecha', hace30Dias).lte('fecha', hoy),
    supabase.from('rutinas').select('alumno_id, dias:rutina_dias(es_descanso)').eq('activa', true) as unknown as Promise<{ data: any[] | null }>,
    supabase.from('registros_bienestar').select('alumno_id, fecha, descanso').gte('fecha', lunes).lte('fecha', hoy) as unknown as Promise<{ data: any[] | null }>,
  ])

  const alumnos = (alumnosRes.data ?? []) as {
    id: string; nombre: string; apellido: string | null
    email: string; suspendido: boolean | null; created_at: string
  }[]

  // Días entrenados por alumno esta semana (distinct fechas)
  const semanaPorAlumno = new Map<string, Set<string>>()
  const rpesPorAlumno = new Map<string, number[]>()
  for (const r of (registrosSemanaRes.data ?? []) as any[]) {
    if (!semanaPorAlumno.has(r.alumno_id)) semanaPorAlumno.set(r.alumno_id, new Set())
    semanaPorAlumno.get(r.alumno_id)!.add(r.fecha)
    if (r.rpe != null) {
      if (!rpesPorAlumno.has(r.alumno_id)) rpesPorAlumno.set(r.alumno_id, [])
      rpesPorAlumno.get(r.alumno_id)!.push(r.rpe)
    }
  }

  // Sueño por alumno esta semana (un valor por fecha, deduplicado)
  const suenoPorAlumno = new Map<string, Map<string, number>>()
  for (const b of (bienestarSemanaRes.data ?? []) as any[]) {
    if (!suenoPorAlumno.has(b.alumno_id)) suenoPorAlumno.set(b.alumno_id, new Map())
    const porFecha = suenoPorAlumno.get(b.alumno_id)!
    if (!porFecha.has(b.fecha)) porFecha.set(b.fecha, b.descanso)
  }

  function promedio(nums: number[]): number | null {
    if (nums.length === 0) return null
    return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
  }

  // Último registro por alumno (mes anterior)
  const ultimoPorAlumno = new Map<string, string>()
  for (const r of registrosMesRes.data ?? []) {
    const prev = ultimoPorAlumno.get(r.alumno_id)
    if (!prev || r.fecha > prev) ultimoPorAlumno.set(r.alumno_id, r.fecha)
  }

  // Días previstos por alumno (días no-descanso de su rutina activa)
  const previstosPorAlumno = new Map<string, number>()
  const rutinasActivasSet = new Set<string>()
  for (const rut of rutinasConDiasRes.data ?? []) {
    rutinasActivasSet.add(rut.alumno_id)
    // Cuento UN día por dia_semana (la rutina puede ser multi-semana — el patrón se repite)
    // Asumo que la primera semana representa el patrón
    const diasNoDescanso = (rut.dias ?? []).filter((d: any) => !d.es_descanso).length
    // Si hay multi-semana, dividir por cantidad de semanas para obtener días por semana
    const semanas = Math.max(1, Math.ceil((rut.dias?.length ?? 0) / 7))
    previstosPorAlumno.set(rut.alumno_id, Math.round(diasNoDescanso / semanas))
  }

  const metricas: AlumnoMetrica[] = alumnos.map((a) => {
    const diasEntrenados = semanaPorAlumno.get(a.id)?.size ?? 0
    const diasPrevistos = previstosPorAlumno.get(a.id) ?? 0
    const ultimo = ultimoPorAlumno.get(a.id) ?? null
    const diasSinEntrenar = ultimo ? diasEntre(ultimo, hoy) : 99
    return {
      id: a.id,
      nombre: a.nombre,
      apellido: a.apellido,
      suspendido: !!a.suspendido,
      rutinaActiva: rutinasActivasSet.has(a.id),
      diasEntrenadosSemana: diasEntrenados,
      diasPrevistosSemana: diasPrevistos,
      diasSinEntrenar,
      ultimoRegistro: ultimo,
      adherenciaSemana: diasPrevistos > 0 ? Math.min(100, Math.round((diasEntrenados / diasPrevistos) * 100)) : null,
      rpePromSemana: promedio(rpesPorAlumno.get(a.id) ?? []),
      suenoPromSemana: promedio([...(suenoPorAlumno.get(a.id)?.values() ?? [])]),
    }
  })

  const activos = metricas.filter(a => !a.suspendido)
  const suspendidos = metricas.filter(a => a.suspendido)
  const entrenarOnCount = activos.filter(a => a.diasEntrenadosSemana > 0).length
  const sinEntrenarCount = activos.filter(a => a.diasEntrenadosSemana === 0).length

  // Alumnos que requieren atención: activos con rutina pero sin entrenar 5+ días
  const requierenAtencion = activos
    .filter(a => a.rutinaActiva && a.diasSinEntrenar >= 5)
    .sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar)

  // Adherencia promedio del gimnasio (solo activos con rutina y previstos > 0)
  const conAdherencia = activos.filter(a => a.adherenciaSemana !== null)
  const adherenciaPromedio = conAdherencia.length > 0
    ? Math.round(conAdherencia.reduce((s, a) => s + (a.adherenciaSemana ?? 0), 0) / conAdherencia.length)
    : null

  // Promedios globales de la semana (solo alumnos activos con datos)
  const rpePromedioGlobal = promedio(activos.map(a => a.rpePromSemana).filter((n): n is number => n !== null))
  const suenoPromedioGlobal = promedio(activos.map(a => a.suenoPromSemana).filter((n): n is number => n !== null))

  return {
    totalAlumnos: alumnos.length,
    activos: activos.length,
    suspendidos: suspendidos.length,
    totalEjercicios: ejerciciosRes.count ?? 0,
    rutinasActivas: rutinasActivasCountRes.count ?? 0,
    entrenarOnCount,
    sinEntrenarCount,
    metricas,
    requierenAtencion,
    adherenciaPromedio,
    rpePromedioGlobal,
    suenoPromedioGlobal,
    lunes,
    hoy,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-5xl space-y-8">

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

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 inline-flex rounded-xl bg-violet-50 p-2.5">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {data.adherenciaPromedio !== null ? `${data.adherenciaPromedio}%` : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Adherencia promedio</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 inline-flex rounded-xl bg-rose-50 p-2.5">
            <Gauge className="h-5 w-5 text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {data.rpePromedioGlobal !== null ? data.rpePromedioGlobal : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">RPE promedio semanal</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2.5">
            <Moon className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {data.suenoPromedioGlobal !== null ? `${data.suenoPromedioGlobal}/7` : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Sueño promedio semanal</p>
        </div>
      </div>

      {/* Alumnos que requieren atención */}
      {data.requierenAtencion.length > 0 && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-amber-200 px-6 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900">
              Requieren atención
            </h2>
            <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
              {data.requierenAtencion.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-100">
            {data.requierenAtencion.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/alumnos/${a.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                    {a.nombre[0].toUpperCase()}{a.apellido?.[0].toUpperCase() ?? ''}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-amber-900">
                      {a.nombre} {a.apellido ?? ''}
                    </p>
                    <p className="text-xs text-amber-700">
                      {a.ultimoRegistro
                        ? `Último entrenamiento hace ${a.diasSinEntrenar} días`
                        : 'Sin registros en el último mes'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {a.diasSinEntrenar >= 99 ? '30+' : a.diasSinEntrenar} d
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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

        {data.metricas.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Todavía no hay alumnos.{' '}
            <Link href="/alumnos" className="text-blue-600 hover:underline">Agregá el primero</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {data.metricas.map((alumno) => {
              const adh = alumno.adherenciaSemana
              const barColor =
                adh === null ? 'bg-slate-200'
                : adh >= 80 ? 'bg-emerald-500'
                : adh >= 50 ? 'bg-yellow-400'
                : adh > 0 ? 'bg-orange-400'
                : 'bg-slate-300'
              return (
                <li key={alumno.id}>
                  <Link
                    href={`/alumnos/${alumno.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      alumno.suspendido ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {alumno.nombre[0].toUpperCase()}{alumno.apellido?.[0].toUpperCase() ?? ''}
                    </div>

                    {/* Nombre + barra de adherencia */}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${alumno.suspendido ? 'text-slate-400' : 'text-slate-900'}`}>
                        {alumno.nombre} {alumno.apellido ?? ''}
                      </p>
                      {!alumno.suspendido && alumno.rutinaActiva && (
                        <div className="mt-1.5 flex items-center flex-wrap gap-2">
                          <div className="h-1.5 flex-1 max-w-[120px] min-w-[60px] overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full ${barColor} transition-all`}
                              style={{ width: `${adh ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {alumno.diasEntrenadosSemana}/{alumno.diasPrevistosSemana || '?'}
                          </span>
                          {alumno.rpePromSemana !== null && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              alumno.rpePromSemana >= 8.5 ? 'bg-red-50 text-red-600'
                              : alumno.rpePromSemana < 6 ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-600'
                            }`}>
                              RPE {alumno.rpePromSemana}
                            </span>
                          )}
                          {alumno.suenoPromSemana !== null && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              alumno.suenoPromSemana < 4 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              😴 {alumno.suenoPromSemana}/7
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Estado */}
                    {alumno.suspendido ? (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <PauseCircle className="h-3 w-3" />
                        Suspendido
                      </span>
                    ) : !alumno.rutinaActiva ? (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        Sin rutina
                      </span>
                    ) : alumno.diasEntrenadosSemana > 0 ? (
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <Flame className="h-3 w-3" />
                        {alumno.diasEntrenadosSemana} {alumno.diasEntrenadosSemana === 1 ? 'día' : 'días'}
                      </span>
                    ) : alumno.diasSinEntrenar >= 7 ? (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {alumno.diasSinEntrenar >= 99 ? '30+' : alumno.diasSinEntrenar}d
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
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
