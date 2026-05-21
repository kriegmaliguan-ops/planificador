import { createClient } from '@/lib/supabase/server'
import { typedList } from '@/lib/supabase/types-helper'
import type { Profile } from '@/lib/types/database'
import { AlumnosCliente } from '@/components/alumnos/AlumnosCliente'

export default async function AlumnosPage() {
  const supabase = await createClient()

  const { data: alumnos } = typedList<Profile>(
    await supabase.from('profiles').select('*').eq('role', 'alumno').order('nombre')
  )

  return (
    <div className="px-4 py-6 md:p-8 max-w-6xl">
      <AlumnosCliente alumnos={alumnos ?? []} />
    </div>
  )
}
