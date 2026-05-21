'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiaHoy } from '@/lib/utils'
import type { RutinaDiaConEjercicios } from '@/lib/types/database'

export function useRutinaHoy(alumnoId: string) {
  const [diaHoy, setDiaHoy] = useState<RutinaDiaConEjercicios | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!alumnoId) return
    const supabase = createClient()

    async function fetchRutinaHoy() {
      const hoy = getDiaHoy()

      const { data, error } = await supabase
        .from('rutina_dias')
        .select(`
          *,
          rutina:rutinas!inner(alumno_id, activa),
          ejercicios:rutina_ejercicios(
            *,
            ejercicio:ejercicios(
              *,
              grupos:ejercicio_grupos(grupo:grupos_musculares(*))
            )
          )
        `)
        .eq('dia_semana', hoy)
        .eq('rutina.alumno_id', alumnoId)
        .eq('rutina.activa', true)
        .order('orden', { referencedTable: 'rutina_ejercicios' })
        .maybeSingle()

      if (error) {
        setError(error.message)
      } else {
        setDiaHoy(data as unknown as RutinaDiaConEjercicios)
      }
      setLoading(false)
    }

    fetchRutinaHoy()
  }, [alumnoId])

  return { diaHoy, loading, error }
}
