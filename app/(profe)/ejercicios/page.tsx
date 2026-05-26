import { createClient } from '@/lib/supabase/server'
import { typedList } from '@/lib/supabase/types-helper'
import type { GrupoMuscular } from '@/lib/types/database'
import { EjerciciosCliente } from '@/components/ejercicios/EjerciciosCliente'

export type EjercicioItem = {
  id: string
  nombre: string
  descripcion: string | null
  video_url: string | null
  grupos: GrupoMuscular[]
}

async function getData() {
  const supabase = await createClient()

  const [ejResult, gruposResult] = await Promise.all([
    supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, video_url, grupos:ejercicio_grupos(grupo:grupos_musculares(id, nombre))')
      .order('nombre'),
    supabase.from('grupos_musculares').select('*').order('nombre'),
  ])

  // Normalizar la relación anidada grupos
  const ejercicios: EjercicioItem[] = ((ejResult.data as any[]) ?? []).map((ej) => ({
    id: ej.id,
    nombre: ej.nombre,
    descripcion: ej.descripcion,
    video_url: ej.video_url,
    grupos: (ej.grupos as any[]).map((g: any) => g.grupo as GrupoMuscular),
  }))

  const grupos = typedList<GrupoMuscular>(gruposResult).data

  return { ejercicios, grupos }
}

export default async function EjerciciosPage() {
  const { ejercicios, grupos } = await getData()

  return (
    <div className="mx-auto p-4 md:p-8 max-w-6xl">
      <EjerciciosCliente ejercicios={ejercicios} grupos={grupos} />
    </div>
  )
}
