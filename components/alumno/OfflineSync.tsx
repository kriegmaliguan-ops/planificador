'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff, CloudUpload, Check, Loader2 } from 'lucide-react'
import { syncOfflineQueue, getPendingCount } from '@/lib/offline-write'

export function OfflineSync() {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<'ok' | 'fail' | null>(null)

  // Estado online/offline + refresh inicial del contador
  useEffect(() => {
    if (typeof navigator === 'undefined') return

    setOnline(navigator.onLine)
    void refreshPending()

    function handleOnline() {
      setOnline(true)
      void doSync()
    }
    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh pending count cuando viene de offline
  useEffect(() => {
    const id = setInterval(() => void refreshPending(), 5000)
    return () => clearInterval(id)
  }, [])

  async function refreshPending() {
    try {
      const n = await getPendingCount()
      setPending(n)
    } catch {/* ignore */}
  }

  async function doSync() {
    if (syncing) return
    setSyncing(true)
    setLastSync(null)
    try {
      const result = await syncOfflineQueue()
      setPending(result.remaining)
      setLastSync(result.failed > 0 ? 'fail' : 'ok')
      if (result.synced > 0) {
        // Refrescar la página para que se vean los cambios servidos
        router.refresh()
      }
    } catch {
      setLastSync('fail')
    } finally {
      setSyncing(false)
      setTimeout(() => setLastSync(null), 3000)
    }
  }

  // Si está online y no hay pendientes y no acaba de sincronizar, no mostrar nada
  if (online && pending === 0 && !syncing && lastSync === null) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-white transition-colors ${
        !online ? 'bg-slate-700'
        : syncing ? 'bg-blue-600'
        : lastSync === 'ok' ? 'bg-emerald-600'
        : lastSync === 'fail' ? 'bg-amber-600'
        : pending > 0 ? 'bg-slate-700'
        : 'bg-slate-700'
      }`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : lastSync === 'ok' ? (
            <Check className="h-4 w-4" />
          ) : online ? (
            <CloudUpload className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            {syncing ? 'Sincronizando...'
              : lastSync === 'ok' ? '¡Listo!'
              : lastSync === 'fail' ? 'Algunos cambios fallaron'
              : !online ? 'Sin conexión'
              : `${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`}
          </p>
          <p className="text-xs opacity-80 leading-tight">
            {syncing ? 'Subiendo tus registros'
              : lastSync === 'ok' ? 'Cambios subidos'
              : lastSync === 'fail' ? 'Reintentaremos automáticamente'
              : !online ? 'Tus registros se guardan localmente'
              : 'Tocá para sincronizar'}
          </p>
        </div>
        {online && pending > 0 && !syncing && lastSync === null && (
          <button
            onClick={doSync}
            className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/30 transition-colors"
          >
            Sincronizar
          </button>
        )}
      </div>
    </div>
  )
}
