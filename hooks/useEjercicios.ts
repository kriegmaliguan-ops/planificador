'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EjercicioConGrupos } from '@/lib/types/database'

export function useEjercicios() {
  const [ejercicios, setEjercicios] = useState<EjercicioConGrupos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchEjercicios() {
      const { data, error } = await supabase
        .from('ejercicios')
        .select(`
          *,
          grupos:ejercicio_grupos(
            grupo:grupos_musculares(*)
          )
        `)
        .order('nombre')

      if (error) {
        setError(error.message)
      } else {
        // Aplanar la relación anidada grupos
        const normalized = (data as any[] ?? []).map((ej) => ({
          ...ej,
          grupos: (ej.grupos as any[]).map((g: any) => g.grupo),
        })) as EjercicioConGrupos[]
        setEjercicios(normalized)
      }
      setLoading(false)
    }

    fetchEjercicios()
  }, [])

  return { ejercicios, loading, error }
}
