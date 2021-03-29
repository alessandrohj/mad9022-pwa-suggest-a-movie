//service worker for suggest-a-movie app
const version = 1;
let staticName = `staticCache-${version}`;
let dynamicName = `dynamicCache-${version}`;
let cacheSize = 65;
let assets = [
  '/',
  '/index.html',
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
          cache.addAll(assets).then(
              ()=> {
                     console.log(`${staticName} has been updated.`);
              },
              (err) => {
                  console.warn(`failed to update ${staticName}.`);
              }
          )
      })
  //     .then(()=>{
  //         caches.open(imageName)
  //         .then((cache)=>{
  //             cache.addAll(imageAssets)
  //             .then(()=>{
  //                 console.log(`${imageName} has been updated.`);
  //             },
  //             (err) => {
  //                 console.warn(`failed to update ${staticName}.`);
  //               }
  //             );
  //         });
  //     })
  )
});

self.addEventListener('activate', (ev) => {
  //activate event - browser now using this version
});

self.addEventListener('fetch', (ev) => {
  //fetch event - web page is asking for an asset
});

self.addEventListener('message', ({ data }) => {
  //message received from a web page that uses this sw
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
