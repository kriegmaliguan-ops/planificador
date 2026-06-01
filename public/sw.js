// Service Worker para Planificador Pro
// Maneja: instalación PWA + Web Push notifications

const VERSION = 'v1'

self.addEventListener('install', (event) => {
  // Activar inmediatamente (no esperar refrescar pestañas viejas)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fetch passthrough — no cacheamos nada por ahora (offline en item 8)
self.addEventListener('fetch', (event) => {
  // No interceptar — el browser maneja todo normal
})

// ── Push notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Planificador Pro', body: event.data.text() }
  }

  const title = data.title || 'Planificador Pro'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if ('focus' in client) {
            if (client.navigate) {
              client.navigate(targetUrl).catch(() => {})
            }
            return client.focus()
          }
        }
        // Si no, abrir una nueva
        return self.clients.openWindow(targetUrl)
      })
  )
})
