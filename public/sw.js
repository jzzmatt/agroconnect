/* Agroconnect offline shell.
 * Caches only this static shell and public icons. Never stores HTML from the
 * app, authenticated responses, API payloads, or requests with credentials.
 */
const CACHE_NAME = "agroconnect-offline-v1";
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/agroconnect.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isPrivateRequest(url, request) {
  if (url.origin !== self.location.origin) return true;
  if (request.headers.has("authorization")) return true;
  const path = url.pathname;
  return (
    path.startsWith("/api/") ||
    path.startsWith("/trpc") ||
    path.startsWith("/_next/data/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isPrivateRequest(url, request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline.html");
        if (offline) return offline;
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  if (!PRECACHE_URLS.includes(url.pathname)) return;

  const cacheKey = url.pathname;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(cacheKey).then((cached) => cached || Promise.reject(new Error("offline")))
      )
  );
});
