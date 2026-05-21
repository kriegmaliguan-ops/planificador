import { redirect } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { RutinaCompleta } from './RutinaCompleta'

export default async function MiRutinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rutina } = await supabase
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
    .maybeSingle() as { data: any | null }

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

  return <RutinaCompleta rutina={rutina} />
}
