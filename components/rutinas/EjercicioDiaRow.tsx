'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { grupoColor } from '@/lib/utils'
import { actualizarEjercicioRutina, removerEjercicioDeRutina } from '@/app/(profe)/rutinas/[alumnoId]/actions'
import { MODALIDADES, type Modalidad, isAgrupada } from '@/lib/modalidades'
import type { EjercicioEnDia } from '@/app/(profe)/rutinas/[alumnoId]/page'

interface EjercicioDiaRowProps {
  ejercicio: EjercicioEnDia
  alumnoId: string
  isFirst?: boolean
  isLast?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<EjercicioEnDia>) => void
}

export function EjercicioDiaRow({ ejercicio, alumnoId, isFirst, isLast, onMoveUp, onMoveDown, onRemove, onUpdate }: EjercicioDiaRowProps) {
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [local, setLocal] = useState({
    series: ejercicio.series,
    repeticiones: ejercicio.repeticiones,
    peso_objetivo: ejercicio.peso_objetivo ?? '',
    descanso_segundos: ejercicio.descanso_segundos ?? 90,
    duracion_segundos: ejercicio.duracion_segundos ?? '',
    notas: ejercicio.notas ?? '',
    rpe_objetivo: ejercicio.rpe_objetivo ?? '',
    modalidad: ejercicio.modalidad ?? 'normal',
    agrupacion: ejercicio.agrupacion ?? '',
    // Cardio
    trabajo_segundos: ejercicio.trabajo_segundos ?? '',
    descanso_intervalo_segundos: ejercicio.descanso_intervalo_segundos ?? '',
    intensidad: ejercicio.intensidad ?? '',
    metros_objetivo: ejercicio.metros_objetivo ?? '',
  })

  const esCardio = ejercicio.modalidad === 'cardio'

  function handleBlurCardio() {
    const payload = {
      series: Number(local.series) || 1,
      trabajo_segundos: local.trabajo_segundos !== '' ? Number(local.trabajo_segundos) : null,
      descanso_intervalo_segundos: local.descanso_intervalo_segundos !== '' ? Number(local.descanso_intervalo_segundos) : null,
      descanso_segundos: Number(local.descanso_segundos) || null,
      intensidad: local.intensidad || null,
      metros_objetivo: local.metros_objetivo !== '' ? Number(local.metros_objetivo) : null,
      rpe_objetivo: local.rpe_objetivo !== '' ? Number(local.rpe_objetivo) : null,
      notas: local.notas || null,
      modalidad: 'cardio',
    }
    startTransition(async () => {
      await actualizarEjercicioRutina(ejercicio.id, alumnoId, payload)
      onUpdate(ejercicio.id, payload as any)
    })
  }

  function handleBlur() {
    const payload = {
      series: Number(local.series) || 3,
      repeticiones: local.repeticiones || '10',
      peso_objetivo: local.peso_objetivo !== '' ? Number(local.peso_objetivo) : null,
      descanso_segundos: Number(local.descanso_segundos) || null,
      duracion_segundos: local.duracion_segundos !== '' ? Number(local.duracion_segundos) : null,
      notas: local.notas || null,
      rpe_objetivo: local.rpe_objetivo !== '' ? Number(local.rpe_objetivo) : null,
      modalidad: local.modalidad || 'normal',
      agrupacion: local.agrupacion || null,
    }
    startTransition(async () => {
      await actualizarEjercicioRutina(ejercicio.id, alumnoId, payload)
      onUpdate(ejercicio.id, payload)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await removerEjercicioDeRutina(ejercicio.id, alumnoId)
      onRemove(ejercicio.id)
    })
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center'

  const mod = ejercicio.modalidad as keyof typeof MODALIDADES
  const modInfo = mod && mod !== 'normal' ? MODALIDADES[mod] : null

  // Border izquierdo según modalidad (visual prominente)
  const borderLeftClass =
    !modInfo ? 'border-slate-200'
    : ejercicio.modalidad === 'biserie' ? 'border-l-4 border-l-purple-400 border border-slate-200'
    : ejercicio.modalidad === 'superserie' ? 'border-l-4 border-l-fuchsia-400 border border-slate-200'
    : ejercicio.modalidad === 'triserie' ? 'border-l-4 border-l-indigo-400 border border-slate-200'
    : ejercicio.modalidad === 'drop_set' ? 'border-l-4 border-l-red-400 border border-slate-200'
    : ejercicio.modalidad === 'rest_pause' ? 'border-l-4 border-l-amber-400 border border-slate-200'
    : ejercicio.modalidad === 'piramidal' ? 'border-l-4 border-l-orange-400 border border-slate-200'
    : ejercicio.modalidad === 'isometrica' ? 'border-l-4 border-l-cyan-400 border border-slate-200'
    : ejercicio.modalidad === 'tempo' ? 'border-l-4 border-l-emerald-400 border border-slate-200'
    : ejercicio.modalidad === 'cardio' ? 'border-l-4 border-l-rose-400 border border-slate-200'
    : 'border-slate-200'

  return (
    <div className={`rounded-xl bg-white transition-shadow ${borderLeftClass} ${isPending ? 'opacity-60' : ''}`}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Nombre + grupos + badge modalidad */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 leading-snug truncate">
              {ejercicio.nombre || '(sin nombre)'}
            </p>
            {modInfo && (
              <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${modInfo.color}`}>
                {modInfo.emoji} {modInfo.short}
                {ejercicio.agrupacion && <span className="ml-0.5 rounded bg-white/50 px-1">{ejercicio.agrupacion}</span>}
              </span>
            )}
          </div>
          {ejercicio.grupos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {ejercicio.grupos.map((g) => (
                <span key={g.id} className={`rounded-full px-1.5 py-0 text-xs font-medium ${grupoColor(g.nombre)}`}>
                  {g.nombre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Campos compactos para cardio */}
        {esCardio && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Series</p>
            <input
              type="number"
              min={1}
              max={50}
              value={local.series}
              onChange={(e) => setLocal((p) => ({ ...p, series: Number(e.target.value) }))}
              onBlur={handleBlurCardio}
              className={`${inputClass} w-14`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Tiempo (s)</p>
            <input
              type="number"
              min={0}
              step={5}
              value={local.trabajo_segundos}
              onChange={(e) => setLocal((p) => ({ ...p, trabajo_segundos: e.target.value as any }))}
              onBlur={handleBlurCardio}
              placeholder="—"
              title="Duración de cada serie/ronda en segundos"
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Intervalo (s)</p>
            <input
              type="number"
              min={0}
              step={5}
              value={local.descanso_intervalo_segundos}
              onChange={(e) => setLocal((p) => ({ ...p, descanso_intervalo_segundos: e.target.value as any }))}
              onBlur={handleBlurCardio}
              placeholder="—"
              title="Descanso entre series/rondas (segundos)"
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Descanso (s)</p>
            <input
              type="number"
              min={0}
              step={15}
              value={local.descanso_segundos}
              onChange={(e) => setLocal((p) => ({ ...p, descanso_segundos: Number(e.target.value) }))}
              onBlur={handleBlurCardio}
              placeholder="—"
              title="Descanso después de terminar el bloque de cardio (segundos)"
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Intensidad</p>
            <input
              type="text"
              value={local.intensidad}
              onChange={(e) => setLocal((p) => ({ ...p, intensidad: e.target.value }))}
              onBlur={handleBlurCardio}
              placeholder="Alta / FC 150"
              title="Intensidad: FC, %FCmax, RPE, o palabras (suave/moderada/alta)"
              className={`${inputClass} w-24`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Metros</p>
            <input
              type="number"
              min={0}
              value={local.metros_objetivo}
              onChange={(e) => setLocal((p) => ({ ...p, metros_objetivo: e.target.value as any }))}
              onBlur={handleBlurCardio}
              placeholder="—"
              title="Distancia objetivo en metros (opcional)"
              className={`${inputClass} w-20`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">RPE obj.</p>
            <select
              value={local.rpe_objetivo}
              onChange={(e) => setLocal((p) => ({ ...p, rpe_objetivo: e.target.value }))}
              onBlur={handleBlurCardio}
              className={`${inputClass} w-16`}
            >
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        )}

        {/* Campos compactos — fuerza/normal */}
        {!esCardio && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Series</p>
            <input
              type="number"
              min={1}
              max={20}
              value={local.series}
              onChange={(e) => setLocal((p) => ({ ...p, series: Number(e.target.value) }))}
              onBlur={handleBlur}
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Reps</p>
            <input
              type="text"
              value={local.repeticiones}
              onChange={(e) => setLocal((p) => ({ ...p, repeticiones: e.target.value }))}
              onBlur={handleBlur}
              placeholder="10"
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Tiempo (s)</p>
            <input
              type="number"
              min={0}
              step={5}
              value={local.duracion_segundos}
              onChange={(e) => setLocal((p) => ({ ...p, duracion_segundos: e.target.value as any }))}
              onBlur={handleBlur}
              placeholder="—"
              title="Tiempo en segundos por serie (para cardio o isométricos). Si lo cargás, ignora 'Reps'."
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">Peso (kg)</p>
            <input
              type="number"
              min={0}
              step={0.5}
              value={local.peso_objetivo}
              onChange={(e) => setLocal((p) => ({ ...p, peso_objetivo: e.target.value }))}
              onBlur={handleBlur}
              placeholder="—"
              className={`${inputClass} w-20`}
            />
          </div>
          {/* Descanso — oculto en biserie/superserie/triserie (se muestra a nivel grupo) */}
          {!['biserie', 'superserie', 'triserie'].includes(ejercicio.modalidad) && (
            <div className="text-center">
              <p className="mb-1 text-xs text-slate-400">Descanso</p>
              <input
                type="number"
                min={0}
                step={15}
                value={local.descanso_segundos}
                onChange={(e) => setLocal((p) => ({ ...p, descanso_segundos: Number(e.target.value) }))}
                onBlur={handleBlur}
                placeholder="90s"
                className={`${inputClass} w-16`}
              />
            </div>
          )}
          <div className="text-center">
            <p className="mb-1 text-xs text-slate-400">RPE obj.</p>
            <select
              value={local.rpe_objetivo}
              onChange={(e) => setLocal((p) => ({ ...p, rpe_objetivo: e.target.value }))}
              onBlur={handleBlur}
              className={`${inputClass} w-16`}
            >
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-1">
          {/* Mover arriba / abajo */}
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={isFirst || isPending}
              className="rounded p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
              title="Subir"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast || isPending}
              className="rounded p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
              title="Bajar"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors sm:hidden"
            title="Editar parámetros"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Quitar ejercicio"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Fila expandida (móvil cardio) */}
      {esCardio && (expanded) && (
        <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
          <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
            {ejercicio.nombre || '(sin nombre)'} — Cardio
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-slate-500">Series</label>
              <input
                type="number"
                min={1}
                value={local.series}
                onChange={(e) => setLocal((p) => ({ ...p, series: Number(e.target.value) }))}
                onBlur={handleBlurCardio}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-slate-500">Tiempo (s)</label>
              <input
                type="number"
                min={0}
                value={local.trabajo_segundos}
                onChange={(e) => setLocal((p) => ({ ...p, trabajo_segundos: e.target.value as any }))}
                onBlur={handleBlurCardio}
                placeholder="—"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-slate-500">Intervalo (s)</label>
              <input
                type="number"
                min={0}
                value={local.descanso_intervalo_segundos}
                onChange={(e) => setLocal((p) => ({ ...p, descanso_intervalo_segundos: e.target.value as any }))}
                onBlur={handleBlurCardio}
                placeholder="—"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-slate-500">Descanso (s)</label>
              <input
                type="number"
                min={0}
                value={local.descanso_segundos}
                onChange={(e) => setLocal((p) => ({ ...p, descanso_segundos: Number(e.target.value) }))}
                onBlur={handleBlurCardio}
                placeholder="—"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-slate-500">Metros</label>
              <input
                type="number"
                min={0}
                value={local.metros_objetivo}
                onChange={(e) => setLocal((p) => ({ ...p, metros_objetivo: e.target.value as any }))}
                onBlur={handleBlurCardio}
                placeholder="—"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block mb-1 text-xs text-slate-500">Intensidad</label>
              <input
                type="text"
                value={local.intensidad}
                onChange={(e) => setLocal((p) => ({ ...p, intensidad: e.target.value }))}
                onBlur={handleBlurCardio}
                placeholder="Alta / FC 150 / Zona 2..."
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block mb-1 text-xs text-slate-500">RPE objetivo</label>
              <select
                value={local.rpe_objetivo}
                onChange={(e) => setLocal((p) => ({ ...p, rpe_objetivo: e.target.value }))}
                onBlur={handleBlurCardio}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">— Sin objetivo —</option>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Fila expandida (móvil) + notas — solo si NO es cardio */}
      {!esCardio && (expanded) && (
        <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
          <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
            {ejercicio.nombre || '(sin nombre)'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Series', key: 'series', type: 'number' },
              { label: 'Reps', key: 'repeticiones', type: 'text' },
              { label: 'Tiempo (s)', key: 'duracion_segundos', type: 'number' },
              { label: 'Peso (kg)', key: 'peso_objetivo', type: 'number' },
              // Descanso oculto si el ejercicio es parte de una biserie/superserie/triserie
              ...(['biserie', 'superserie', 'triserie'].includes(ejercicio.modalidad) ? [] : [{ label: 'Descanso (s)', key: 'descanso_segundos', type: 'number' }]),
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block mb-1 text-xs text-slate-500">{label}</label>
                <input
                  type={type}
                  value={(local as any)[key]}
                  onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
            <div>
              <label className="block mb-1 text-xs text-slate-500">RPE objetivo</label>
              <select
                value={local.rpe_objetivo}
                onChange={(e) => setLocal((p) => ({ ...p, rpe_objetivo: e.target.value }))}
                onBlur={handleBlur}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Sin objetivo —</option>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Modalidad — siempre visible si no es normal o si está expandido */}
      <div className="border-t border-slate-100 px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Modalidad</span>
          <select
            value={local.modalidad}
            onChange={(e) => {
              const nuevaMod = e.target.value as Modalidad
              setLocal((p) => ({
                ...p,
                modalidad: nuevaMod,
                // Si la nueva modalidad no requiere agrupación, limpiar el campo
                agrupacion: isAgrupada(nuevaMod) ? p.agrupacion : '',
              }))
            }}
            onBlur={handleBlur}
            className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {(Object.keys(MODALIDADES) as Modalidad[]).map((m) => (
              <option key={m} value={m}>
                {MODALIDADES[m].emoji ? `${MODALIDADES[m].emoji} ` : ''}{MODALIDADES[m].label}
              </option>
            ))}
          </select>
          {isAgrupada(local.modalidad as Modalidad) && (
            <>
              <span className="text-[10px] text-slate-400">grupo:</span>
              <input
                type="text"
                maxLength={3}
                value={local.agrupacion}
                onChange={(e) => setLocal((p) => ({ ...p, agrupacion: e.target.value.toUpperCase() }))}
                onBlur={handleBlur}
                placeholder="A"
                title="Letra/número para agrupar con otro ejercicio (mismo valor = misma biserie/triserie)"
                className="w-10 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-center font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-[10px] text-slate-400 italic">
                {local.agrupacion ? `Pone ${local.agrupacion} en otro ejercicio para agruparlos` : 'Asigná una letra'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Notas — siempre visible */}
      <div className="border-t border-slate-100 px-4 py-2">
        <input
          type="text"
          value={local.notas}
          onChange={(e) => setLocal((p) => ({ ...p, notas: e.target.value }))}
          onBlur={handleBlur}
          placeholder="Notas del ejercicio (ej: baja en 3 seg, sube en 1)..."
          className="w-full rounded-lg border-0 bg-transparent px-0 py-1 text-xs text-slate-500 outline-none placeholder:text-slate-300"
        />
      </div>
    </div>
  )
}
