const CACHE_NAME='work-order-v36-8-20260828';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './final-icon-192.png',
  './final-icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of APP_SHELL){ try{ await cache.add(url); }catch(_){} }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const req=event.request;
  const url=new URL(req.url);

  // Supabase API/Auth must NEVER be cached. Offline logic is handled by the app.
  if(url.hostname.endsWith('.supabase.co')){
    event.respondWith(fetch(req));
    return;
  }

  // Navigation: network first, cached app shell as fallback.
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const cache=await caches.open(CACHE_NAME);
        cache.put('./index.html',fresh.clone()).catch(()=>{});
        return fresh;
      }catch(_){
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // Static assets/CDN only: cache first.
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    const fresh=await fetch(req);
    if(fresh && (fresh.ok || fresh.type==='opaque')){
      const cache=await caches.open(CACHE_NAME);
      cache.put(req,fresh.clone()).catch(()=>{});
    }
    return fresh;
  })());
});
