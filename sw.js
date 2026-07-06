/* GainsTracker service worker — NETWORK-FIRST for the app, CACHE-FOREVER for exercise demo GIFs.
   The app always pulls the latest deploy when you're online, and falls back to the last
   cached copy when you're offline. On activation it clears any stale app cache left by an older
   service worker, so a frozen/installed PWA self-heals to the newest build.

   Exercise demo GIFs (exercisedb.p.rapidapi.com) are the opposite: cached FOREVER on first
   fetch and served from cache ever after — each demo costs exactly one API request per device,
   keeps the monthly quota safe, and works offline.

   IMPORTANT: this only manages the Cache Storage of fetched files. It NEVER touches
   localStorage, where all your workouts, PRs, splits and progress live — your data is safe. */
const RUNTIME = 'gt-runtime-v3';
const GIFS = 'gt-exgifs-v1';

self.addEventListener('install', () => {
  // Take over as soon as possible instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Nuke every old app cache — but NEVER the demo-GIF store (re-downloading it would burn API quota).
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== GIFS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Exercise demo GIFs: cache-first, stored forever.
  if (url.hostname === 'exercisedb.p.rapidapi.com') {
    e.respondWith((async () => {
      const cache = await caches.open(GIFS);
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const resp = await fetch(e.request);
      try {
        if (resp && (resp.ok || resp.type === 'opaque')) await cache.put(e.request, resp.clone());
      } catch (_) { /* storage full or uncacheable — just serve it */ }
      return resp;
    })());
    return;
  }

  e.respondWith((async () => {
    try {
      // Always try the network first so updates land immediately. cache:'no-cache' forces a
      // revalidation with the server (ETag) instead of trusting iOS's sticky HTTP cache —
      // without it, GitHub Pages' 10-min cache header can serve a stale copy from disk.
      const fresh = await fetch(e.request, { cache: 'no-cache' });
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
