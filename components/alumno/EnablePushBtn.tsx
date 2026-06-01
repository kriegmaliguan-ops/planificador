'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X, Check, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'push-dismissed'
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function EnablePushBtn() {
  const [estado, setEstado] = useState<'oculto' | 'visible' | 'suscribiendo' | 'suscripto' | 'error'>('oculto')
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!VAPID_KEY) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem(STORAGE_KEY)) return

    // Si ya tiene una suscripción activa, no mostrar
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) return  // ya suscripto, no molestar
      // Esperar un poco para no abrumar al usuario al entrar
      setTimeout(() => setEstado('visible'), 2500)
    }).catch(() => {})
  }, [])

  async function handleActivar() {
    if (!VAPID_KEY) { setMensaje('Falta configuración VAPID'); setEstado('error'); return }
    setEstado('suscribiendo')
    setMensaje(null)

    try {
      // 1) Pedir permiso
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMensaje('Permiso denegado')
        setEstado('error')
        return
      }

      // 2) Obtener SW listo
      const reg = await navigator.serviceWorker.ready

      // 3) Suscribirse al PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })

      // 4) Mandar suscripción al backend
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!res.ok) {
        setMensaje('Error al registrar la suscripción')
        setEstado('error')
        return
      }

      setEstado('suscripto')
      setTimeout(() => setEstado('oculto'), 2500)
    } catch (err: any) {
      console.error(err)
      setMensaje(err?.message ?? 'No se pudo activar')
      setEstado('error')
    }
  }

  function handleDescartar() {
    localStorage.setItem(STORAGE_KEY, '1')
    setEstado('oculto')
  }

  if (estado === 'oculto') return null

  if (estado === 'suscripto') {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 shadow-lg text-white">
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Notificaciones activadas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 shadow-lg text-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Activá las notificaciones</p>
          <p className="text-xs text-slate-400 leading-tight">
            {mensaje ?? 'Recibí avisos cuando el profe actualiza tu rutina'}
          </p>
        </div>
        <button
          onClick={handleActivar}
          disabled={estado === 'suscribiendo'}
          className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {estado === 'suscribiendo' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Activando...
            </>
          ) : (
            'Activar'
          )}
        </button>
        <button
          onClick={handleDescartar}
          disabled={estado === 'suscribiendo'}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
