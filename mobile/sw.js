const CACHE = 'pocket-paws-shell-v2';
const SHELL = ['./', './index.html', './planner.html', './planner.css', './planner.js', './planner-model.js', './mobile.css', './mobile.js', './model.js', './auth-loader.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', '../cat-mascot.svg', '../cat-paw.svg', '../widget-data.js'];
const paths = new Set(SHELL.map(path => new URL(path, self.location.href).pathname));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); });
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pocket-paws-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Cache only public UI assets. Never intercept Firebase auth or financial requests.
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || !paths.has(url.pathname)) return;
    event.respondWith(fetch(event.request).then(response => {
        if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
        return response;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }).then(cached => cached || Response.error())));
});
