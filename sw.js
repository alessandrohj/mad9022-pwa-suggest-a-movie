//service worker for suggest-a-movie app
const version = 1;
let staticCache = `staticCache-${version}`;
let dynamicCache = `dynamicCache-${version}`;
let cacheSize = 65;
let DB = null;
let pageAssets = [
  './',
  './img/',
  './index.html',
  './css/main.css',
  './css/materialize.min.css',
  './js/app.js',
  './js/materialize.min.js',
  './manifest.json',
  './404.html',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v78/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
];
let imageAssets = [
  './img/icon-72x72.png',
  './img/icon-96x96.png',
  './img/icon-128x128.png',
  './img/icon-144x144.png',
  './img/icon-152x152.png',
  './img/icon-192x192.png',
  './img/icon-384x384.png',
  './img/icon-512x512.png', 
  './img/offline.png',
  './img/tmdb.svg'
];
const offlinePage =   '404.html';
let dynamicList = [];

//cache limit function
const limitCacheSize = (cacheName, size) =>{
  caches.open(cacheName)
  .then(cache=>{
    cache.keys()
    .then(keys=>{
      if(keys.length > size){
        cache.delete(keys[0])
        .then(limitCacheSize(cacheName, size))
      }
    })
  })
}

self.addEventListener('install', (ev) => {
  //install event - browser has installed this version
  console.log('service worker has been installed ', version, ev);
  // build cache
  ev.waitUntil(
      caches.open(staticCache)
      .then((cache) => {
        return cache.addAll(imageAssets) && cache.addAll(pageAssets);
      })
      .then(()=> {
        return self.skipWaiting();
      },
      (err) => {
        console.warn(`${err} - failed to update ${staticCache}.`);
    }
    )
      )
});

self.addEventListener('activate', (ev) => {
  //activate event - browser now using this version
  console.log('activated');
  // delete old versions of caches.
  ev.waitUntil(
      caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            if (cacheName != staticCache && cacheName != dynamicCache) {
              return true;
          }}).map(cacheName =>{
            return caches.delete(cacheName);
          })
        )
      })
      .then((empties) => {
        //empties is an Array of boolean values.
        //one for each cache deleted
        //TODO:
        console.log('Deleted successfully:', empties);
        // return self.clients.claim();
      })
  )
    });

self.addEventListener('fetch', (ev) => {
  //fetch event - web page is asking for an asset
// check if resource exists in cache. If it exists, return it, if not fetch it from network
    const requestURL = new URL(ev.request.url);
  ev.respondWith(
    caches.match(ev.request)
    .then(response=>{
      // const cachedOfflinePage = caches.match(offlinePage);
      return response || fetch(ev.request).then(fetchResponse =>{
        return caches.open(dynamicCache)
        .then(cache=>{
          cache.put(ev.request.url, fetchResponse.clone());
          limitCacheSize(dynamicCache, cacheSize);
          return fetchResponse;
        })
      })
    })
    .catch(() =>{
      if(ev.request.url.indexOf('.html') > -1){
        return caches.match(offlinePage);
      }
    })
  );
});


self.addEventListener('message', ({ data }) => {
  //message received from a web page that uses this sw
  console.log('Message received from page', data);
});


const sendMessage = async (msg) => {
  //send a message from the service worker to the webpage(s)
  let allClients = await clients.matchAll({ includeUncontrolled: true });
  return Promise.all(
    allClients.map((client) => {
      let channel = new MessageChannel();
      channel.port1.onmessage = onMessage;
      if ('isOnline' in msg) {
        console.log('tell the browser if online');
      }
      //port1 for send port2 for receive
      return client.postMessage(msg, [channel.port2]);
    })
  );
  
};

