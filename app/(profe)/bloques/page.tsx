import { Layers, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BloquesCliente } from './BloquesCliente'

export const dynamic = 'force-dynamic'

export interface BloqueItem {
  id: string
  nombre: string
  descripcion: string | null
  cantEjercicios: number
  ejercicios: Array<{
    id: string
    nombre: string
    series: number
    repeticiones: string
    peso_objetivo: number | null
    rpe_objetivo: number | null
  }>
}

async function getBloques(): Promise<BloqueItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bloques_dia')
    .select(`
      id, nombre, descripcion,
      ejercicios:bloque_ejercicios(
        id, orden, series, repeticiones, peso_objetivo, rpe_objetivo,
        ejercicio:ejercicios(id, nombre)
      )
    `)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  return (data ?? []).map((b) => {
    const ejs = ((b.ejercicios ?? []) as any[])
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((re) => ({
        id: re.id,
        nombre: re.ejercicio?.nombre ?? 'Ejercicio',
        series: re.series,
        repeticiones: re.repeticiones,
        peso_objetivo: re.peso_objetivo,
        rpe_objetivo: re.rpe_objetivo,
      }))
    return {
      id: b.id,
      nombre: b.nombre,
      descripcion: b.descripcion,
      cantEjercicios: ejs.length,
      ejercicios: ejs,
    }
  })
}

export default async function BloquesPage() {
  const bloques = await getBloques()

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Layers className="h-6 w-6 text-violet-600" />
          Bloques de día
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Conjuntos reutilizables de ejercicios (ej: <em>"Pecho y tríceps"</em>) que podés aplicar a cualquier día de cualquier rutina con un click.
        </p>
        <div className="mt-3 rounded-xl bg-blue-50 px-4 py-2.5 ring-1 ring-blue-200 text-xs text-blue-900">
          <p className="font-semibold mb-0.5 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            ¿Cómo se crean?
          </p>
          <p>
            Entrá a la rutina de cualquier alumno, armá un día como te guste, y tocá <strong>"Guardar día como bloque"</strong>. Después podés aplicarlo a cualquier otro día.
          </p>
        </div>
      </div>

      <BloquesCliente initial={bloques} />
    </div>
  )
}
