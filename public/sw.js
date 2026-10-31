// Offline shell: cache-first for static assets, network-first with cache fallback for pages and lecture/flashcard reads.
const CACHE = "classpulse-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/app", "/icon.svg"]).catch(() => {}))); });
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const cacheable = url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/app") || url.pathname.startsWith("/api/lectures") || url.pathname.startsWith("/api/faq");
  if (!cacheable) return;
  if (url.pathname.startsWith("/_next/static")) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
});
