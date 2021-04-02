//service worker for suggest-a-movie app
const version = 1;
let staticCache = `staticCache-${version}`;
let dynamicCache = `dynamicCache-${version}`;
let currentCaches = [
    static = `staticCache-${version}`,
    dynamic = `dynamicCache-${version}`
];
let cacheSize = 65;
let DB = null;
let assets = [
  '/',
  './img/',
  './index.html',
  './css/main.css',
  './css/materialize.min.css',
  './js/app.js',
  './js/materialize.min.js',
  './404.html',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v78/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
];
const offlinePage =   './404.html';
let dynamicList = [];

self.addEventListener('install', (ev) => {
  //install event - browser has installed this version
  console.log('service worker has been installed ', version, ev);
  // build cache
  ev.waitUntil(
      caches.open(staticCache)
      .then((cache) => {
        return cache.addAll(assets);
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
    )
      .then((empties) => {
        //empties is an Array of boolean values.
        //one for each cache deleted
        //TODO:
        console.log('Deleted successfully:', empties);
        return self.clients.claim();
      })
    });

self.addEventListener('fetch', (ev) => {
  //fetch event - web page is asking for an asset
// check if resource exists in cache. If it exists, return it, if not fetch it from network
caches.match(ev.request)
.then((response)=>{
  // checking if it exists and returning it
  return response || fetch(ev.request)
  .then((response) =>{
    if(!response){
      const cachedOfflinePage = caches.match(offlinePage);
      return cachedOfflinePage;
    }
    // check if the fetch contains API resources (images and array) to add to Dynamic cache
    if (
      ev.request.url.startsWith("https://image.tmdb.org/t/p/") || ev.request.url.startsWith("https://api.themoviedb.org/3/") && ev.request.method === "GET"
    ) {
        (async () => {
          const cache = await caches.open(dynamicCache);
            //Always try the network first
            const networkResponse = response.clone();
            cache.put(ev.request, networkResponse);
            return response;
        })()
  }
    
}
).catch(err=>{
  const cachedOfflinePage = caches.match(offlinePage);
  return cachedOfflinePage;
})
})

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

// function fetchAndCache(url) {
//   return fetch(url)
//   .then((response) => {
//     // Check if we received a valid response
//     if (!response.ok) {
//       throw Error(response.statusText);
//     }
//     return caches.open(dynamicCache)
//     .then((cache) => {
//       cache.put(url, response.clone());
//       return response;
//     });
//   })
//   .catch((err) => {
//     console.log('Request failed:', err);
//     // You could return a custom offline 404 page here
//   });
// }
