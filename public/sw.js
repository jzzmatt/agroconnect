/* Agroconnect offline shell.
 * Caches only this static shell and public icons. Never stores HTML from the
 * app, authenticated responses, API payloads, or requests with credentials.
 *
 * Navigations are intentionally not intercepted. Wrapping document requests
 * breaks Clerk's handshake redirect and surfaces as a middleware 500.
 */
const CACHE_NAME = "agroconnect-offline-v2";
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
    path.startsWith("/_next/") ||
    path.startsWith("/__clerk")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  // Document loads, including Clerk handshakes, must reach the network directly.
  if (request.mode === "navigate") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isPrivateRequest(url, request)) return;
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  const cacheKey = url.pathname;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
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
