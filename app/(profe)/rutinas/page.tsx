import Link from 'next/link'
import { CalendarDays, ChevronRight, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface RutinaRow {
  id: string
  nombre: string
  activa: boolean
  fecha_inicio: string | null
  alumno_id: string
  alumno_nombre: string
  alumno_apellido: string | null
}

async function getRutinas(): Promise<RutinaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rutinas')
    .select('id, nombre, activa, fecha_inicio, alumno_id, alumno:profiles!alumno_id(nombre, apellido)')
    .eq('is_template', false)
    .order('activa', { ascending: false })
    .order('created_at', { ascending: false }) as { data: any[] | null }

  return (data ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    activa: r.activa,
    fecha_inicio: r.fecha_inicio,
    alumno_id: r.alumno_id,
    alumno_nombre: r.alumno?.nombre ?? '—',
    alumno_apellido: r.alumno?.apellido ?? null,
  }))
}

export default async function RutinasPage() {
  const rutinas = await getRutinas()
  const activas = rutinas.filter((r) => r.activa)
  const inactivas = rutinas.filter((r) => !r.activa)

  return (
    <div className="mx-auto px-4 py-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Rutinas</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {activas.length} activas · {inactivas.length} inactivas
        </p>
      </div>

      {rutinas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <CalendarDays className="h-12 w-12 text-slate-300" />
          <div>
            <p className="font-medium text-slate-700">Todavía no hay rutinas</p>
            <p className="mt-1 text-sm text-slate-400">
              Creá una rutina desde el perfil de un alumno.
            </p>
          </div>
          <Link href="/alumnos" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
            Ver alumnos
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Activas', list: activas, dot: 'bg-emerald-400' },
            { label: 'Inactivas', list: inactivas, dot: 'bg-slate-300' },
          ].map(({ label, list, dot }) =>
            list.length > 0 ? (
              <section key={label}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </h2>
                <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                  {list.map((r) => (
                    <Link
                      key={r.id}
                      href={`/rutinas/${r.alumno_id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{r.nombre}</p>
                        <p className="text-sm text-slate-500">
                          {r.alumno_nombre} {r.alumno_apellido ?? ''}
                          {r.fecha_inicio && (
                            <span className="ml-2 text-slate-400">
                              · desde {new Date(r.fecha_inicio).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
