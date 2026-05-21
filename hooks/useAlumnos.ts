'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

export function useAlumnos() {
  const [alumnos, setAlumnos] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchAlumnos() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'alumno')
        .order('nombre')

      if (error) {
        setError(error.message)
      } else {
        setAlumnos(data ?? [])
      }
      setLoading(false)
    }

    fetchAlumnos()
  }, [])

  return { alumnos, loading, error }
}
