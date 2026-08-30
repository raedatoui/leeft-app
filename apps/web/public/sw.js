// Cache name is versioned via the ?v= query on the registration URL (see
// serviceWorkerRegister.tsx): a new version registers a new SW whose activation
// drops the previous build's cache instead of accumulating chunks forever.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'v2';
const CACHE_NAME = `leeft-shell-${VERSION}`;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    // Requests that explicitly ask to revalidate (e.g. the foreground build check
    // in serviceWorkerRegister.tsx) bypass the SW cache entirely.
    if (request.cache === 'no-cache' || request.cache === 'reload' || request.cache === 'no-store') return;

    // Navigations go network-first so a fresh deploy is picked up immediately;
    // the cache is only the offline fallback. Fetch by URL with cache: 'no-cache'
    // to force HTTP-cache revalidation (fetch(request) would accept stale HTML,
    // and a navigation Request can't be re-constructed with a RequestInit).
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                try {
                    const response = await fetch(request.url, { cache: 'no-cache' });
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                } catch {
                    const cached = await cache.match(request);
                    return cached || Response.error();
                }
            })
        );
        return;
    }

    // Everything else (hashed build assets, fonts) stays cache-first with background refresh.
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const network = fetch(request)
                .then((response) => {
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
