//service worker for suggest-a-movie app
const version = 1;
let staticName = `staticCache-${version}`;
let dynamicName = `dynamicCache-${version}`;
let currentCaches = [
    static = `staticCache-${version}`,
    dynamic = `dynamicCache-${version}`
];
let cacheSize = 65;
let DB = null;
let assets = [
  '/',
  './index.html',
  './css/main.css',
  './css/materialize.min.css',
  './js/app.js',
  './js/materialize.min.js',
  './404.html',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v78/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
];
let dynamicList = [];

self.addEventListener('install', (ev) => {
  //install event - browser has installed this version
  console.log('service worker has been installed ', version, ev);
  // build cache
  ev.waitUntil(
      caches
      .open(staticName)
      .then((cache) => {
        return Promise.all(
          assets.map((item)=>{
            return cache.add(item).catch((reason)=> {
              console.log(reason);
            })
          })
        )
          .then(
              ()=> {
                     console.log(`${staticName} has been updated.`);
              },
              (err) => {
                  console.warn(`${err} - failed to update ${staticName}.`);
              }
          )
      })
  )
});

self.addEventListener('activate', (ev) => {
  //activate event - browser now using this version
  console.log('activated');
  // delete old versions of caches.
  ev.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys .filter((key) => {
          if (key != staticName) {
            return true;
          }
        })
        .map((key) => caches.delete(key))
      ).then((empties) => {
        //empties is an Array of boolean values.
        //one for each cache deleted
        //TODO:
      })
    })
  );
});

self.addEventListener('fetch', (ev) => {
  //fetch event - web page is asking for an asset
// check if resource exists in cache. If it exists, return it, if not fetch it from network
  caches.match(ev.request).then((response)=>{
    // checking if it exists and returning it
    if (response) {

      return response;
    } 
    // if it doesn't exist, fetch from network
    return fetch(ev.request).then(function(response) {
      // check if the fetch contains API resources (images and array) to add to Dynamic cache
      if (
        ev.request.url.startsWith("https://image.tmdb.org/t/p/") || ev.request.url.startsWith("https://api.themoviedb.org/3/") && ev.request.method === "GET"
      ) {
          (async () => {
            const cache = await caches.open(dynamicName);
            try { 
              //Always try the network first
              const networkResponse = fetch(ev.request);
              cache.put(ev.request, (await networkResponse).clone());
              return networkResponse;
            } catch (err) {
              //If there was a network error, check the cache
              const cachedResult = await cache.match(ev.request);
              return cachedResult;
            }
          })()
    }
      
    }
  )})

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
      //port1 for send port2 for receive
      return client.postMessage(msg, [channel.port2]);
    })
  );
  
};