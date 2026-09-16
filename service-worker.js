const CACHE='todo-pwa-cache-v1.0.1';
const ASSETS=['./','./index.html','./style.css','./layout-config.css','./app.js','./db.js','./backup.js','./version.js','./manifest.json','./version.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/version.json')||u.pathname.endsWith('version.json')){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./version.json')));return}
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))));
});
