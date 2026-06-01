import Link from 'next/link'
import { FileText, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CrearPlantillaBtn } from './CrearPlantillaBtn'
import { EliminarPlantillaBtn } from './EliminarPlantillaBtn'

export const dynamic = 'force-dynamic'

interface PlantillaRow {
  id: string
  nombre: string
  created_at: string
  diasCount: number
  ejerciciosCount: number
}

async function getPlantillas(): Promise<PlantillaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rutinas')
    .select(`
      id, nombre, created_at,
      dias:rutina_dias(id, ejercicios:rutina_ejercicios(id))
    `)
    .eq('is_template', true)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  return (data ?? []).map((r) => {
    const dias = (r.dias ?? []) as any[]
    const ejerciciosCount = dias.reduce((acc, d) => acc + ((d.ejercicios ?? []).length), 0)
    return {
      id: r.id,
      nombre: r.nombre,
      created_at: r.created_at,
      diasCount: dias.length,
      ejerciciosCount,
    }
  })
}

export default async function PlantillasPage() {
  const plantillas = await getPlantillas()

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plantillas de rutina</h1>
          <p className="mt-1 text-sm text-slate-500">
            Diseñá rutinas base y asignalas a varios alumnos con un click.
          </p>
        </div>
        <CrearPlantillaBtn />
      </div>

      {plantillas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FileText className="h-12 w-12 text-slate-300" />
          <div>
            <p className="font-medium text-slate-700">Todavía no hay plantillas</p>
            <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto px-4">
              Las plantillas son rutinas base que podés clonar al asignar
              una rutina a un alumno. Ideal si tenés varios alumnos con
              objetivos parecidos.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          {plantillas.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 sm:px-6 hover:bg-slate-50 transition-colors group">
              <Link
                href={`/plantillas/${p.id}`}
                className="flex items-center gap-4 flex-1 py-4 min-w-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.diasCount} día{p.diasCount === 1 ? '' : 's'} · {p.ejerciciosCount} ejercicio{p.ejerciciosCount === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
              <EliminarPlantillaBtn plantillaId={p.id} nombre={p.nombre} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
