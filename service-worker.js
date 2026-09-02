const CACHE_NAME='work-order-v36-9-8-20260901';
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
    for(const url of APP_SHELL){
      try{ await cache.add(url); }catch(_){}
    }
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

  // IMPORTANT: Supabase API/auth/data must NEVER be cached.
  // Every verification must read the real current cloud state.
  if(url.hostname.endsWith('.supabase.co')){
    event.respondWith(fetch(req));
    return;
  }

  // Navigations: network first, app shell only as offline fallback.
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

  // Static assets: cache first, network fills cache.
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
