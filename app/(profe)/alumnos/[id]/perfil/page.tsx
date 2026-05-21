import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PerfilForm } from './PerfilForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PerfilAlumnoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: alumno } = await supabase
    .from('profiles')
    .select('id, email, nombre, apellido, peso, altura, fecha_nacimiento, objetivo, notas_profe')
    .eq('id', id)
    .eq('role', 'alumno')
    .single() as {
      data: {
        id: string; email: string; nombre: string; apellido: string | null
        peso: number | null; altura: number | null; fecha_nacimiento: string | null
        objetivo: string | null; notas_profe: string | null
      } | null
    }

  if (!alumno) notFound()

  return <PerfilForm alumno={alumno} />
}
