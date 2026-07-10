'use strict'

const APP_CACHE   = 'rs-shell-v1'
const VIDEO_CACHE = 'rs-videos-v1'

// ── Install — cache the offline fallback page ────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.addAll(['/offline']))
      .then(() => self.skipWaiting())
  )
})

// ── Activate — clean up old cache versions ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== APP_CACHE && k !== VIDEO_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Downloaded episode videos — serve from cache, fall back to network.
  // Covers both the legacy Cloudinary host and the current Bunny CDN hosts
  // (videos migrated from Cloudinary to Bunny; old downloads may still be
  // cached under the Cloudinary URL, new ones are cached under Bunny URLs).
  const isVideoHost = (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/video/'))
    || url.hostname.endsWith('.b-cdn.net')
  if (isVideoHost) {
    e.respondWith(serveCachedVideo(request))
    return
  }

  // Navigation — network first, /offline page as fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then(r => r ?? new Response('Offline', { status: 503 }))
      )
    )
  }
})

// Serve a cached video, handling Range requests so the browser can seek
async function serveCachedVideo(request) {
  const cache  = await caches.open(VIDEO_CACHE)
  // Match by URL only — ignores Range / other headers from the browser
  const stored = await cache.match(request.url)
  if (!stored) return fetch(request)

  const range = request.headers.get('range')
  if (!range) return stored.clone()

  // Parse Range header and return a 206 Partial Content slice
  const buffer             = await stored.clone().arrayBuffer()
  const total              = buffer.byteLength
  const [, startStr, endStr] = /bytes=(\d+)-(\d*)/.exec(range) ?? []
  const start = parseInt(startStr || '0', 10)
  const end   = endStr ? parseInt(endStr, 10) : total - 1
  const chunk = buffer.slice(start, end + 1)

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range':  `bytes ${start}-${end}/${total}`,
      'Content-Length': String(end - start + 1),
      'Content-Type':   stored.headers.get('Content-Type') ?? 'video/mp4',
      'Accept-Ranges':  'bytes',
    },
  })
}

// ── Messages from the app ─────────────────────────────────────────────────────
self.addEventListener('message', e => {
  const { type, url } = e.data ?? {}

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (type === 'CACHE_VIDEO' && url) {
    e.waitUntil(cacheVideo(url, e.source))
    return
  }

  if (type === 'DELETE_VIDEO' && url) {
    e.waitUntil(
      caches.open(VIDEO_CACHE).then(c => c.delete(url))
    )
  }
})

async function cacheVideo(url, client) {
  try {
    const cache    = await caches.open(VIDEO_CACHE)
    const existing = await cache.match(url)
    if (existing) {
      client?.postMessage({ type: 'CACHE_DONE', url })
      return
    }
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await cache.put(url, response.clone())
    client?.postMessage({ type: 'CACHE_DONE', url })
  } catch (err) {
    client?.postMessage({ type: 'CACHE_ERROR', url, error: err?.message ?? 'Erro' })
  }
}
