const CACHE='panda-modes-PANDA_BUILD';
const FILES=['./','./index.html','./style.css','./modes.css','./journal.css','./bootstrap.js','./app.js','./engine.js','./analytics.js','./journal.js','./journal-view.js','./online.js','./bot.js','./bot-worker.js','./panda.svg','./panda-rust.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('panda-modes-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
