/* GainsTracker service worker — NETWORK-FIRST.
   The app always pulls the latest deploy when you're online, and falls back to the last
   cached copy when you're offline. On activation it clears any stale cache left by an older
   service worker, so a frozen/installed PWA self-heals to the newest build.

   IMPORTANT: this only manages the Cache Storage of fetched files. It NEVER touches
   localStorage, where all your workouts, PRs, splits and progress live — your data is safe. */
const RUNTIME = 'gt-runtime-v1';

self.addEventListener('install', () => {
  // Take over as soon as possible instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Nuke every old cache (including any cache-first store from a previous version).
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      // Always try the network first so updates land immediately.
      const fresh = await fetch(e.request);
      try {
        const cache = await caches.open(RUNTIME);
        await cache.put(e.request, fresh.clone());
      } catch (_) { /* opaque/cross-origin responses can't be cached — ignore */ }
      return fresh;
    } catch (err) {
      // Offline: serve the last good copy if we have one.
      const cached = await caches.match(e.request);
      if (cached) return cached;
      throw err;
    }
  })());
});
