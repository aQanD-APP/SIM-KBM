// SIM KBM Ustaz V2.0 - Service Worker
const CACHE_NAME = 'simkbm-v4.0.1';
const STALE_CACHE_TIMEOUT = 30000; // 30 seconds

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4.0.1...');
  self.skipWaiting();
});

// Activate event - remove old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('simkbm-'))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event with strict caching rules
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // RULE 1: NEVER cache navigation/HTML requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          console.log('[SW] Navigation request from network:', url.pathname);
          return response;
        })
        .catch((error) => {
          console.error('[SW] Navigation fetch failed:', error);
          return new Response(
            '<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>Offline</h1><p>Tidak dapat terhubung. Periksa internet Anda.</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // RULE 2: NEVER cache Supabase/API requests
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => {
          console.log('[SW] API request failed, no fallback');
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // RULE 3: For static assets (.js, .css, fonts, images) - use cache-first
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|webp|json)$/i)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            console.log('[SW] Static asset from cache:', url.pathname);
            // Update cache in background (fire-and-forget)
            fetch(event.request)
              .then((freshResponse) => {
                if (freshResponse && freshResponse.status === 200) {
                  cache.put(event.request, freshResponse.clone());
                }
              })
              .catch(() => {});
            return response;
          }

          // Not in cache, fetch from network
          console.log('[SW] Static asset from network:', url.pathname);
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                cache.put(event.request, responseClone);
              }
              return response;
            })
            .catch((error) => {
              console.error('[SW] Static asset fetch failed:', url.pathname, error);
              return new Response('Asset not available', { status: 503 });
            });
        });
      })
    );
    return;
  }

  // RULE 4: Default - network first with timeout
  event.respondWith(
    Promise.race([
      fetch(event.request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), STALE_CACHE_TIMEOUT)
      ),
    ])
      .then((response) => response)
      .catch(() => {
        console.log('[SW] Default strategy failed:', url.href);
        return new Response('Offline', { status: 503 });
      })
  );
});
