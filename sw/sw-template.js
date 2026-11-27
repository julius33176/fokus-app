/* Fokus – Service Worker (wird beim Build nach dist/sw.js geschrieben, siehe vite.config.ts).
   Strategie: Alle Build-Dateien werden beim Installieren vorgeladen. Danach startet die App
   immer aus dem Cache (schnell, offline). Neue Versionen werden im Hintergrund geladen und erst
   nach Bestätigung in der App aktiv („Neue Version – neu laden“). */

const VERSION = '__VERSION__'
const BASE = '__BASE__'
const PRECACHE = __PRECACHE__
const CACHE = `fokus-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((p) => BASE + p))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fokus-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (req.mode === 'navigate') {
    // /fokus-app/stats/ → stats/index.html; unbekannte Pfade → index.html
    const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname
    event.respondWith(
      caches
        .match(path, { cacheName: CACHE, ignoreVary: true })
        .then((hit) => hit || caches.match(BASE + 'index.html', { cacheName: CACHE, ignoreVary: true }))
        .then((hit) => hit || fetch(req)),
    )
    return
  }

  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)))
})
