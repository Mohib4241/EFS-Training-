// Lets the browser offer "Install app". It caches nothing and answers no request itself, so a new deploy is always what loads.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
