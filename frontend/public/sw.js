/* RestaurantOS service worker — stale-while-revalidate for GET /api + assets */
const VERSION = "rx-v1";
const API_CACHE = `rx-api-${VERSION}`;
const STATIC_CACHE = `rx-static-${VERSION}`;

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;

  // API GETs: stale-while-revalidate (skip auth + mutations)
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || new Response(JSON.stringify({ offline: true }), { status: 503, headers: { "Content-Type": "application/json" } }));
        return cached || networkPromise;
      })()
    );
    return;
  }

  // static assets: cache-first for hashed files
  if (["script", "style", "image", "font"].includes(req.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (_) {
          return cached || Response.error();
        }
      })()
    );
  }
});
