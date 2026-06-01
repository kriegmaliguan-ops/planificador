'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Bell, Check, Dumbbell, UserPlus, PlayCircle, Megaphone, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { marcarTodasLeidas } from '@/app/(alumno)/notificaciones/actions'

export interface Notif {
  id: string
  tipo: string
  titulo: string
  mensaje: string | null
  leida: boolean
  created_at: string
}

interface Props {
  userId: string
  initialCount: number
  initialNotifs: Notif[]
}

const TIPO_ICON: Record<string, React.ElementType> = {
  rutina_nueva: Dumbbell,
  bienvenida: UserPlus,
  plan_reactivado: PlayCircle,
  mensaje_profe: MessageCircle,
}

function getIcon(tipo: string) {
  const Icon = TIPO_ICON[tipo] ?? Megaphone
  return Icon
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function NotifBell({ userId, initialCount, initialNotifs }: Props) {
  const [count, setCount] = useState(initialCount)
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  // Supabase Realtime — escucha nuevas notificaciones
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nueva = payload.new as Notif
          setNotifs((prev) => [nueva, ...prev].slice(0, 15))
          setCount((c) => c + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleMarcarLeidas() {
    startTransition(async () => {
      await marcarTodasLeidas()
      setCount(0)
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })))
    })
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Panel dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
          {/* Header del panel */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Notificaciones
              {count > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {count} nueva{count !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            {count > 0 && (
              <button
                onClick={handleMarcarLeidas}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 disabled:opacity-50 transition-colors"
              >
                <Check className="h-3 w-3" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Lista */}
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">Todo al día por acá</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {notifs.map((n) => {
                const Icon = getIcon(n.tipo)
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      !n.leida ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Ícono de tipo */}
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      !n.leida ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${!n.leida ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${
                        !n.leida ? 'font-semibold text-slate-900' : 'text-slate-700'
                      }`}>
                        {n.titulo}
                      </p>
                      {n.mensaje && (
                        <p className="mt-0.5 text-xs text-slate-500 leading-snug">{n.mensaje}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">{formatRelative(n.created_at)}</p>
                    </div>

                    {/* Dot no leída */}
                    {!n.leida && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
