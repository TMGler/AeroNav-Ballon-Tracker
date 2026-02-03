const CACHE_NAME = 'aeronav-v3'; // Version erhöht -> Erzwingt Update
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Aktivierung & Aufräumen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Strategie: Cache First, then Network (Stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // Nur GET requests cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Netzwerk-Request immer starten, um Cache zu aktualisieren
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Überprüfen ob Antwort gültig ist
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            return networkResponse;
        }

        // Caching Strategie für Karten-Kacheln und App-Dateien
        const url = event.request.url;
        if (url.includes('tile.openstreetmap') || 
            url.includes('cartocdn') || 
            url.includes('arcgisonline') ||
            url.includes(self.location.origin)) { // Eigene Dateien cachen
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch((err) => {
         // Netzwerkfehler sind okay, wenn wir einen Cache haben.
         // Wenn KEIN Cache da ist, wird dieser Fehler weitergeworfen,
         // damit der Browser seine Offline-Seite zeigt (statt weißer Seite).
         if (cachedResponse) return cachedResponse;
         throw err;
      });

      // Wenn im Cache, sofort zurückgeben, sonst auf Netzwerk warten
      return cachedResponse || fetchPromise;
    })
  );
});
