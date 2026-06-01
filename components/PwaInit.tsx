'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (/sw.js) al cargar la app.
 * Necesario para PWA install + push notifications.
 */
export function PwaInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Registrar después del load para no bloquear el render inicial
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('SW register failed:', err))
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
