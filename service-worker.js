self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('pixelevate-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
