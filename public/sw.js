// Service Worker para Planificador Pro
// Maneja: instalación PWA + Web Push notifications + cache offline

const CACHE_NAME = 'planificador-v4'
// Solo pre-cacheamos assets estáticos (no rutas autenticadas — esas se
// cachean on-visit cuando el usuario ya tiene sesión iniciada).
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  // Activar inmediatamente
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {/* algunos pueden fallar, no aborta */})
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar caches viejos
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

// ── Fetch handler ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Solo nuestro origen
  if (url.origin !== location.origin) return
  // Solo GET (POST = server actions, las dejamos pasar)
  if (req.method !== 'GET') return
  // No interceptar API routes ni rutas de auth/login
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return
  if (url.pathname === '/login') return
  // No cachear el SW mismo
  if (url.pathname === '/sw.js') return

  // Static assets de Next: cache-first (son immutable por hash)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req))
    return
  }

  // Imágenes y assets de public/
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req))
    return
  }

  // HTML pages: network-first con fallback a cache
  const accept = req.headers.get('accept') || ''
  if (accept.includes('text/html') || req.mode === 'navigate') {
    event.respondWith(networkFirstHTML(req))
    return
  }

  // Otros GET: network-first
  event.respondWith(networkFirst(req))
})

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    return new Response('', { status: 503 })
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response('', { status: 503 })
  }
}

async function networkFirstHTML(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    // Solo cacheamos respuestas exitosas y NO redirecciones (evita cachear /login redirects)
    if (response && response.ok && response.status === 200 && !response.redirected) {
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    // Fallback: intentar cualquier página cacheada del alumno
    const urls = ['/rutina', '/mi-rutina', '/progreso', '/perfil']
    for (const u of urls) {
      const fallback = await cache.match(u)
      if (fallback) return fallback
    }
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sin conexión</title>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:white;padding:20px;text-align:center}h1{margin-bottom:8px}p{color:#94a3b8;max-width:320px}</style>' +
      '</head><body><div><h1>Sin conexión</h1>' +
      '<p>Abrí la app al menos una vez con internet para que pueda funcionar offline después.</p>' +
      '</div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

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
        for (const client of clientList) {
          if ('focus' in client) {
            if (client.navigate) client.navigate(targetUrl).catch(() => {})
            return client.focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})

// ── Mensajes desde la app para forzar refresh del SW ────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
