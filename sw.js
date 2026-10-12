const CACHE="lumen-39ebd0885fb3";
const FILES=['./','index.html','assets/lumen/game.js','assets/lumen/game.css','assets/lumen/icon.svg','assets/lumen/icon-192.png','assets/lumen/icon-512.png','assets/lumen/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('lumen-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||!FILES.some(f=>new URL(f,self.registration.scope).href===e.request.url))return;e.respondWith(fetch(e.request).then(r=>r).catch(()=>caches.match(e.request)));});
