import { Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CalentamientosCliente } from './CalentamientosCliente'

export const dynamic = 'force-dynamic'

export interface CalentamientoItem {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number | null
  video_url: string | null
}

async function getCalentamientos(): Promise<CalentamientoItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('calentamientos')
    .select('id, nombre, descripcion, duracion_minutos, video_url')
    .order('nombre', { ascending: true }) as { data: CalentamientoItem[] | null }
  return data ?? []
}

export default async function CalentamientosPage() {
  const calentamientos = await getCalentamientos()

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Flame className="h-6 w-6 text-orange-500" />
          Calentamientos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Biblioteca de calentamientos. Asigná uno por día en cada rutina.
        </p>
      </div>

      <CalentamientosCliente initial={calentamientos} />
    </div>
  )
}
