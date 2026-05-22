import { redirect } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHoyChile } from '@/lib/utils'
import { RutinaCompleta } from './RutinaCompleta'

export default async function MiRutinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = getHoyChile()

  // Fecha de hace 7 días para traer toda la semana de bienestar
  const [y, m, d] = hoy.split('-').map(Number)
  const hace7 = new Date(y, m - 1, d - 6)
  const hace7Str = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, '0')}-${String(hace7.getDate()).padStart(2, '0')}`

  const [rutinaResult, progresoResult, bienestarResult] = await Promise.all([
    supabase
      .from('rutinas')
      .select(`
        id, nombre,
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

    // Bienestar de los últimos 7 días (para todos los días de la semana)
    supabase
      .from('registros_bienestar')
      .select('fecha, descanso, notas')
      .eq('alumno_id', user.id)
      .gte('fecha', hace7Str)
      .lte('fecha', hoy) as unknown as Promise<{ data: { fecha: string; descanso: number; notas: string | null }[] | null }>,
  ])

  const rutina = rutinaResult.data
  const completadosHoy = (progresoResult.data ?? []).map(r => r.rutina_ejercicio_id)

  // Mapa fecha → registro de bienestar
  const bienestarPorFecha: Record<string, { descanso: number; notas: string | null }> = {}
  for (const b of bienestarResult.data ?? []) {
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

  return (
    <RutinaCompleta
      rutina={rutina}
      completadosHoy={completadosHoy}
      bienestarPorFecha={bienestarPorFecha}
      hoy={hoy}
    />
  )
}
