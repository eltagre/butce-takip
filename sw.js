const SCOPE = self.registration.scope;
const CACHE = "butcem-shell:" + SCOPE + ":8.8.0";
const INDEX = new URL("index.html", SCOPE).href;
const ASSETS = [
 "index.html", "manifest.json", "icon.svg", "finance.css?v=8.8.0", "vendor/supabase-2.119.2.js",
 "supabase-config.js?v=8.2", "sync-merge.js?v=8.8.0", "app.js?v=8.8.0",
 "statements.js?v=8.8.0", "receipt-parser.js?v=8.8.0", "receipts.js?v=8.8.0"
].map(path => new URL(path,SCOPE).href);

self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS.map(url=>new Request(url,{cache:"reload"})));
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key!==CACHE&&(key.startsWith("butcem-shell:"+SCOPE+":")||key==="butcem-cache-v8-4-0"))await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const {request}=event;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(request.mode==="navigate"&&url.href.startsWith(SCOPE)){
  event.respondWith(fetch(request).catch(async()=>(await caches.open(CACHE)).match(INDEX)));
 }else if(ASSETS.includes(url.href)){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   return await cache.match(request)||fetch(request);
  })());
 }
});
self.addEventListener("message",event=>{
 if(event.data==="SKIP_WAITING")self.skipWaiting();
});
