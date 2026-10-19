/* GainsTracker service worker — NETWORK-FIRST (with a lie-fi timeout) for the app, CACHE-FOREVER for exercise demo GIFs.
   The app pulls the latest deploy when you're online, and falls back to the last cached copy when you're
   offline — or when the network is "connected" but hanging (lie-fi): same-origin requests race a ~3 s
   timeout, and on a timeout the cached copy is served instantly while the network request keeps going in the
   background and refreshes the cache for next time. On activation it clears any stale app cache left by an
   older service worker, so a frozen/installed PWA self-heals to the newest build.

   Exercise demo GIFs (exercisedb.p.rapidapi.com) are the opposite: cached FOREVER on first
   fetch and served from cache ever after — each demo costs exactly one API request per device,
   keeps the monthly quota safe, and works offline.

   IMPORTANT: this only manages the Cache Storage of fetched files. It NEVER touches
   localStorage, where all your workouts, PRs, splits and progress live — your data is safe. */
const RUNTIME = 'gt-runtime-v5';
const GIFS = 'gt-exgifs-v1';
const NET_TIMEOUT_MS = 3000; // lie-fi guard: how long a same-origin request may hang before the cache wins

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

// Network fetch that refreshes the runtime cache on success. cache:'no-cache' forces a revalidation with
// the server (ETag) instead of trusting iOS's sticky HTTP cache — without it, GitHub Pages' 10-min cache
// header can serve a stale copy from disk.
async function fetchAndCache(request) {
  const fresh = await fetch(request, { cache: 'no-cache' });
  try {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, fresh.clone());
  } catch (_) { /* opaque/cross-origin responses can't be cached — ignore */ }
  return fresh;
}

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

  // Start the network request right away; keep the worker alive so a slow response can still refresh the cache.
  const net = fetchAndCache(e.request);
  e.waitUntil(net.then(() => {}, () => {}));

  e.respondWith((async () => {
    // Cross-origin calls (cloud sync etc.) keep the plain network-first behaviour — never serve those stale on a timer.
    const guarded = url.origin === self.location.origin;
    let timer;
    try {
      if (!guarded) return await net;
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('lie-fi timeout')), NET_TIMEOUT_MS); });
      return await Promise.race([net, timeout]);
    } catch (err) {
      // Offline, or the network hung past the timeout: serve the last good copy if we have one.
      const cached = await caches.match(e.request);
      if (cached) return cached;
      return net; // nothing cached yet — wait for the network (rejects if offline, like before)
    } finally {
      clearTimeout(timer);
    }
  })());
});
