'use client'

import {
  registrarProgreso,
  registrarBienestar,
  registrarPeso,
  registrarTodoDia,
  registrarMedidas,
} from '@/app/(alumno)/rutina/actions'
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  incrementRetries,
  type ActionType,
} from './offline-db'

const ACTIONS: Record<ActionType, (payload: any) => Promise<any>> = {
  registrarProgreso,
  registrarBienestar,
  registrarPeso,
  registrarMedidas,
  registrarTodoDia,
}

function isNetworkError(err: any): boolean {
  if (!err) return false
  const msg = String(err.message ?? err).toLowerCase()
  return /failed to fetch|network|networkerror|load failed|connection/.test(msg)
}

export interface OfflineWriteResult {
  ok: boolean
  queued: boolean
  error?: string
}

/**
 * Ejecuta una acción del servidor. Si falla por red o el dispositivo
 * está offline, la encola en IndexedDB para sincronizar después.
 */
export async function offlineWrite(
  type: ActionType,
  payload: any
): Promise<OfflineWriteResult> {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true

  if (!online) {
    try {
      await addToQueue(type, payload)
      return { ok: true, queued: true }
    } catch (e: any) {
      return { ok: false, queued: false, error: e?.message ?? 'No se pudo guardar offline' }
    }
  }

  try {
    const result = await ACTIONS[type](payload)
    if (result && result.error) {
      return { ok: false, queued: false, error: result.error }
    }
    return { ok: true, queued: false }
  } catch (err: any) {
    if (isNetworkError(err)) {
      try {
        await addToQueue(type, payload)
        return { ok: true, queued: true }
      } catch (e: any) {
        return { ok: false, queued: false, error: e?.message ?? 'Error al encolar' }
      }
    }
    return { ok: false, queued: false, error: err?.message ?? 'Error desconocido' }
  }
}

export interface SyncResult {
  synced: number
  failed: number
  remaining: number
}

/**
 * Procesa la cola offline. Devuelve cuántos items sincronizó.
 * Detiene si se cae el internet de nuevo.
 */
export async function syncOfflineQueue(): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const remaining = (await getQueue()).length
    return { synced: 0, failed: 0, remaining }
  }

  const queue = await getQueue()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      const result = await ACTIONS[item.type](item.payload)
      if (result && result.error) {
        // Error de aplicación (4xx-like): retry hasta 3 veces, luego descartar
        if (item.retries >= 3) {
          await removeFromQueue(item.id)
        } else {
          await incrementRetries(item.id)
        }
        failed++
      } else {
        await removeFromQueue(item.id)
        synced++
      }
    } catch (err: any) {
      if (isNetworkError(err)) {
        // Sigue sin internet, parar la sincronización
        break
      }
      // Otros errores: incrementar retries
      if (item.retries >= 3) {
        await removeFromQueue(item.id)
      } else {
        await incrementRetries(item.id)
      }
      failed++
    }
  }

  const remaining = (await getQueue()).length
  return { synced, failed, remaining }
}

export async function getPendingCount(): Promise<number> {
  return (await getQueue()).length
}
