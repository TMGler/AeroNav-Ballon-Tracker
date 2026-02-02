const CACHE_NAME = 'aeronav-v2'; // Version erhöht -> Erzwingt Update der index.html
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

// Installation: Cache aufbauen
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Zwingt den neuen Worker sofort aktiv zu werden
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Aktivierung: Alte Caches (v1) löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Lösche alten Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch: Anfragen abfangen und cachen
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // "Stale-while-revalidate" Strategie
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        
        // Caching Strategie für Karten-Kacheln (inkl. Satellit)
        const url = event.request.url;
        if (url.includes('tile.openstreetmap') || 
            url.includes('cartocdn') || 
            url.includes('arcgisonline')) { 
            
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
            });
        }
        return networkResponse;
      }).catch(() => {
         // Offline und nicht im Cache? Hier könnte man ein Fallback-Bild senden
      });

      return cachedResponse || fetchPromise;
    })
  );
});
