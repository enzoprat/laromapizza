/**
 * Service worker minimal — juste ce qu'il faut pour une PWA installable.
 *
 * Règles :
 *  - navigations et API : toujours le réseau d'abord (une carte périmée ou un
 *    panier périmé seraient pires qu'une page qui charge un peu plus lentement) ;
 *  - fichiers statiques : servis depuis le cache, ce qui rend la navigation
 *    entre catégories quasi instantanée ;
 *  - rien de l'administration n'est jamais mis en cache.
 */
const CACHE = "laroma-v1";
const STATIC = /^\/(?:_next\/static|img|icon-|apple-touch-icon|favicon)/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match("/")),
      ),
    );
  }
});
