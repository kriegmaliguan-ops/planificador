import { redirect } from 'next/navigation'
import { Dumbbell, PauseCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHoyChile, getSemanaActualPorFecha } from '@/lib/utils'
import { RutinaCompleta } from './RutinaCompleta'

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default async function MiRutinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = getHoyChile()

  const { data: profile } = await supabase
    .from('profiles').select('suspendido').eq('id', user.id).single() as { data: { suspendido: boolean } | null }

  if (profile?.suspendido === true) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <PauseCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Tu plan está pausado</h2>
        <p className="mt-2 text-sm text-slate-500">
          Contactá a tu profe para reactivar el acceso.
        </p>
      </div>
    )
  }

  // Bienestar: 90 días cubre hasta ~12 semanas de historial
  const hace90Str = addDays(hoy, -90)

  const [rutinaResult, progresoResult, bienestarResult] = await Promise.allSettled([
    supabase
      .from('rutinas')
      .select(`
        id, nombre, fecha_inicio,
        dias:rutina_dias(
          id, dia_semana, nombre, orden, es_descanso, semana_numero,
          ejercicios:rutina_ejercicios(
            id, orden, series, repeticiones, peso_objetivo, descanso_segundos, notas,
            ejercicio:ejercicios(id, nombre, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre)))
          )
        )
      `)
      .eq('alumno_id', user.id)
      .eq('activa', true)
      .maybeSingle() as unknown as Promise<{ data: any | null }>,

    supabase
      .from('registros_progreso')
      .select('rutina_ejercicio_id')
      .eq('alumno_id', user.id)
      .eq('fecha', hoy) as unknown as Promise<{ data: { rutina_ejercicio_id: string }[] | null }>,

    supabase
      .from('registros_bienestar')
      .select('fecha, descanso, notas')
      .eq('alumno_id', user.id)
      .gte('fecha', hace90Str)
      .lte('fecha', hoy) as unknown as Promise<{ data: { fecha: string; descanso: number; notas: string | null }[] | null }>,
  ])

  const rutina = rutinaResult.status === 'fulfilled' ? rutinaResult.value.data : null
  const completadosHoy = (progresoResult.status === 'fulfilled' ? (progresoResult.value.data ?? []) : []).map((r: { rutina_ejercicio_id: string }) => r.rutina_ejercicio_id)

  // Mapa fecha → registro de bienestar
  const bienestarPorFecha: Record<string, { descanso: number; notas: string | null }> = {}
  for (const b of (bienestarResult.status === 'fulfilled' ? (bienestarResult.value.data ?? []) : [])) {
    bienestarPorFecha[b.fecha] = { descanso: b.descanso, notas: b.notas }
  }

  if (!rutina) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <Dumbbell className="mb-4 h-14 w-14 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Sin rutina asignada</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tu profe todavía no te asignó una rutina. ¡Ya llegará!
        </p>
      </div>
    )
  }

  // ── Detectar semana activa por fecha de inicio (cronológico) ──────────────────
  const maxSemana = Math.max(...(rutina.dias ?? []).map((d: any) => d.semana_numero ?? 1), 1)
  const semanaDetectada = rutina.fecha_inicio
    ? getSemanaActualPorFecha(rutina.fecha_inicio, hoy, maxSemana)
    : 1

  return (
    <RutinaCompleta
      rutina={rutina}
      completadosHoy={completadosHoy}
      bienestarPorFecha={bienestarPorFecha}
      hoy={hoy}
      semanaDetectada={semanaDetectada}
      fechaInicio={(rutina.fecha_inicio as string | null) ?? null}
    />
  )
}
