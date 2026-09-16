const CACHE='todo-pwa-cache-v1.0.6';
const ASSETS=['./','./index.html','./style.css','./layout-config.css','./app.js','./db.js','./backup.js','./version.js','./manifest.json','./version.json','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('todo-pwa-cache-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  // 版本檔永遠優先抓網路，避免舊快取讓更新檢查失準。
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('version.json')){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('./version.json')));
    return;
  }

  // 頁面導覽採網路優先，部署新版本後可直接取得最新 index；離線時回到已快取首頁。
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  // 靜態資源採快取優先。若真的不存在，不可錯誤回傳 index.html 假裝成 CSS / JS / JSON / 圖片。
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}
    return response;
  })));
});
