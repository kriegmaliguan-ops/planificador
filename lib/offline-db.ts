'use client'

// IndexedDB wrapper para la cola de escrituras offline.
// Cuando el alumno registra algo sin internet, se guarda acá
// y se sincroniza automáticamente al volver online.

const DB_NAME = 'planificador-offline'
const DB_VERSION = 1
const STORE = 'queue'

export type ActionType =
  | 'registrarProgreso'
  | 'registrarBienestar'
  | 'registrarPeso'
  | 'registrarMedidas'
  | 'registrarTodoDia'

export interface QueueItem {
  id: string
  type: ActionType
  payload: any
  createdAt: number
  retries: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
  })
}

export async function addToQueue(
  type: ActionType,
  payload: any
): Promise<string> {
  const db = await openDB()
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const item: QueueItem = { id, type, payload, createdAt: Date.now(), retries: 0 }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(item)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).index('createdAt').getAll()
      req.onsuccess = () => resolve(req.result as QueueItem[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function incrementRetries(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.get(id)
    req.onsuccess = () => {
      const item = req.result as QueueItem | undefined
      if (item) {
        item.retries++
        store.put(item)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
