const APP = {
  BASE_URL: 'https://api.themoviedb.org/3/',
  IMG_URL: 'https://image.tmdb.org/t/p/',
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],
  API_KEY: 'a1b2f514b71b98f4fdeabd6fae26bd24',
  isOnline: 'onLine' in navigator && navigator.onLine,
  isStandalone: false,
  sw: null, //your service worker
  db: null, //your database
  getDB: null,
  dbVersion: 1,
  dbStoreResults: 'movieStore',
  dbStoreSimilar: 'suggestedStore',
  results: null,
  suggestedResults: [],
  deferredInstall: null,
  init() {
    //open the database and run the pageLoaded function as a callback, after DB has launched
    APP.openDB(APP.pageLoaded);
    //register service worker
    APP.worker();
    //add UI listeners
    APP.addListeners();
    //check if the app was launched from installed version
    if (navigator.standalone) {
      // console.log('Launched: Installed (iOS)');
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      // console.log('Launched: Installed');
      APP.isStandalone = true;
    } else {
      // console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }
  },
  worker: ()=>{
    if('serviceWorker' in navigator){
      window.addEventListener("load", function() {
      navigator.serviceWorker
      .register('./sw.js', {
          scope: './',
      })
      .then( (reg)=> console.log('Service Worker registered.', reg))
      .catch((err)=> console.log('Service Worker not registered.', err))

      //listen for the latest sw
      navigator.serviceWorker.addEventListener('controllerchange', async ()=>{
        APP.sw = navigator.serviceWorker.controller;
      })
      // listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', APP.onMessage)
  })
}
  },
  pageLoaded() {
    //page has just loaded and we need to check the queryString
    //based on the querystring value(s) run the page specific tasks
    console.log('page loaded and checking', location.search);
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    if (keyword) {
      //means we are on results.html
      console.log(`on results.html - startSearch(${keyword})`);
      APP.startSearch(keyword);
    }
    let mid = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (mid && ref) {
      //we are on suggest.html
      console.log(`look in db for movie_id ${mid} or do fetch`);
      APP.startSuggest({ mid, ref });
    }
  },
  addListeners() {
    //TODO:
    //listen for on and off line events
    window.addEventListener('online', (ev) => {
      navigator.serviceWorker.controller.postMessage({
        checkOnline: APP.isOnline,
      })
      APP.goneOnline();
    });
      //tell the service worker about the change to online
    window.addEventListener('offline', (ev) => {
      APP.goneOffline();
      //tell the service worker about the change to offline
      navigator.serviceWorker.controller.postMessage({
        checkOnline: APP.isOnline,
      })
    });
    //TODO:
    //listen for Chrome install prompt
    //handle the deferredPrompt
    window.addEventListener('beforeinstallprompt', (ev) => {
      // Prevent the mini-infobar from appearing on mobile
      ev.preventDefault();
      // Save the event in a global property
      // so that it can be triggered later.
      APP.deferredInstall = ev;
      console.log('deferredPrompt saved');
      // Build your own enhanced install experience
      // use the APP.deferredPrompt saved event
    });
    //listen to install button/click
    // Offer to install PWA/APP  after 5 seconds on site.
    if(document.querySelector('#installButton')){
    let button = document.querySelector('#installButton');
    button.addEventListener('click', APP.installApp);
  }

  //FAB listener to open search
    let elems = document.querySelector('.modal');
    M.Modal.init(elems, {});

    // FAB Menu - Index.html
    if(document.querySelector('.tap-target')){
      let tapTarget = document.querySelector('.tap-target');
      let instances = M.TapTarget.init(tapTarget, {});
      instances.open();
    }


    //listen for sign that app was installed
    window.addEventListener('appinstalled', (evt) => {
      console.log('app was installed');
      let installButton = document.querySelector('#installation');
      installButton.classList.add('hide');
    });

    //listen for submit of the search form
    let searchForm = document.searchForm;
    if (searchForm) {
      document.searchForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        //build the queryString and go to the results page
        let searchInput = document.getElementById('search');
        let keyword = searchInput.value.trim();
        if (keyword) {
          let base = location.href;
          let url = new URL('./results.html', base);
          url.search = '?keyword=' + encodeURIComponent(keyword);
          location.href = url;
        }
      });
    }

    //listen for the click of movie div
    //to handle clicks of the suggest a movie buttons
    let movies = document.querySelector('.movies');
    if (movies) {
      //navigate to the suggested page
      //build the queryString with movie id and ref title
      movies.addEventListener('click', (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === 'A') {
          let card = anchor.closest('.card');
          let title = card.querySelector('.card-title span').textContent;
          let mid = card.getAttribute('data-id');
          let base = location.href;
          let url = new URL('./suggest.html', base);
          url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        }
      });
    }
  },
  installApp: ()=>{
    if(APP.deferredInstall){
      APP.deferredInstall.prompt();
      APP.deferredInstall.userChoice.then((choice)=>{
        if(choice.outcome == 'accepted') {
          console.log('App installed');
        } else {
          console.log('User cancelled installation');
        }
      })
    }
  },
  sendMessage(msg, target) {
    //TODO:
    //send a message to the service worker
    if(navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage(msg);
    }
  },
  onMessage({ data }) {
    //TODO:
    //message received from service worker
    console.log('Web page receiving: ', data);
  },
  startSearch(keyword) {
    //TODO: check in IDB for movie results
    if (keyword) {
      //check the db
      //if no matches make a fetch call to TMDB API
      //or make the fetch call and intercept it in the SW  
      //check IndexedDB and build a list of movies if there's a result from it
      APP.getDataFromIDB(APP.dbStoreResults, keyword, ()=>{
        // APP.buildList(dataDB);
        APP.useSearchResults(keyword);
      },
      APP.doSearch)
      }
    
  },
  doSearch: (keyword)=>{
    let url = `${APP.BASE_URL}search/movie?api_key=${APP.API_KEY}&query=${keyword}`;
    //if no result from it, fetch the API
    //This function is called after the DB is checked
    APP.getData(url, (data) => {
      //this is the CALLBACK to run after the fetch
      console.log('data fetched');
      APP.results = data.results;
      APP.useSearchResults(keyword);
      APP.addDataToIDB(APP.results, keyword, APP.dbStoreResults); //add fetched data do DB
    });
  },
  
  useSearchResults(keyword) {
    //after getting fetch or db results
    //display search keyword in title
    //then call buildList
    let movies = APP.results;
    let keywordSpan = document.querySelector('.ref-keyword');
    if (keyword && keywordSpan) {
      keywordSpan.textContent = keyword;
    }
    APP.buildList(movies);
  },
  startSuggest({ mid, ref }) {
    //TODO: Do the search of IndexedDB for matches
    //if no matches to a fetch call to TMDB API
    //or make the fetch call and intercept it in the SW

      //check IndexedDB and build a list of movies if there's a result from it
      APP.getDataFromIDB(APP.dbStoreSimilar, mid, (dataDB)=>{
        // APP.buildList(dataDB);
        APP.suggestedResults = dataDB;
        APP.useSuggestedResults(ref);
      }, APP.doSuggest) //callback function in case object doesn't exist in DB
  },
  doSuggest: (mid)=>{
    let params = new URL(document.location).searchParams;
    let ref = params.get('ref');

    let url = `${APP.BASE_URL}movie/${mid}/recommendations?api_key=${APP.API_KEY}&ref=${ref}`;
    //TODO: choose between /similar and /suggested endpoints from API
    APP.getData(url, (data) => {
      //this is the callback that will be used after fetch
      APP.suggestedResults = data.results;
      APP.useSuggestedResults(ref);
      APP.addDataToIDB(APP.suggestedResults, mid, APP.dbStoreSimilar);
    });
  },
  useSuggestedResults(ref) {
    //after getting fetch/db results
    //display reference movie name in title
    //then call buildList
    let movies = APP.suggestedResults;
    let titleSpan = document.querySelector('.ref-movie');
    console.log('ref title', ref);
    if (ref && titleSpan) {
      titleSpan.textContent = ref;
    }
    APP.buildList(movies);
  },
  getData: async (url, cb) => {
    fetch(url)
      .then((resp) => {
        if (resp.ok) {
          return resp.json();
        } else {
          let msg = resp.statusText;
          throw new Error(`Could not fetch movies. ${msg}.`);
        }
      })
      .then((data) => {
        //callback
        cb(data);
        console.log(data);
      })
      .catch((err) => {
        console.warn(err);
        cb({ code: err.code, message: err.message, results: [] });
      });
  },
  buildList: (movies) => {
    //build the list of cards inside the current page
    console.log(`show ${movies.length} cards`);
    let container = document.querySelector(`.movies`);
    //TODO: customize this HTML to make it your own
    if (container) {
      let moviesPage = document.querySelector('.page');
      moviesPage.classList.add('active');
      if (movies.length > 0) {
        container.innerHTML = movies
          .map((obj) => {
            let img = './img/icon-512x512.png';
            if (obj.poster_path != null) {
              img = APP.IMG_URL + 'w500' + obj.poster_path;
            }
            return `<div class="col s12 m6 l4">
            <div class="card hoverable large" data-id="${obj.id}">
          <div class="card-image">
            <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
            </div>
          <div class="card-content activator">
            <h3 class="card-title"><span>${obj.title}</span><i class="material-icons right">more_vert</i></a></h3>
          </div>
          <div class="card-reveal">
            <span class="card-title grey-text text-darken-4">${obj.title}<i class="material-icons right">close</i></span>
            <h6>${obj.release_date}</h6>
            <p>${obj.overview}</p>
          </div>
          <div class="card-action">
            <a href="#" class="find-suggested light-blue-text text-darken-3">Show Similar<i class="material-icons right">search</i></a>
            </div>
          </div>
        </div>`;
          })
          .join('\n');
      } else {
        //no cards
        container.innerHTML = `<div class="card hoverable">
          <div class="card-content">
            <h3 class="card-title activator"><span>No Content Available.</span></h3>
          </div>
        </div>`;
      }
    }
  },
  openDB: (cb) => {
    //TODO:
    //open the indexedDB
    //upgradeneeded listener
    //success listener
    //save db reference as APP.db
    //error listener
let req = indexedDB.open('deje0014-PWA-suggest-a-movie', APP.dbVersion);

req.addEventListener('success', (ev) => {
  APP.db = ev.target.result;
console.log('DB opened and upgraded as needed.', APP.db);
cb();

})

req.addEventListener('upgradeneeded', (ev) => {
  APP.db = ev.target.result;
  let oldVersion = ev.oldVersion;
  let newVersion = ev.newVersion || APP.db.version;
  console.log(`Upgrading DB from version ${oldVersion} to version ${newVersion}`);
  if (!APP.db.objectStoreNames.contains(APP.dbStoreResults) || ! APP.db.objectStoreNames.contains(APP.dbStoreSimilar)){
     APP.db.createObjectStore(APP.dbStoreResults);
     APP.db.createObjectStore(APP.dbStoreSimilar);
  }
  })

req.addEventListener('error', (err) => {
console.warn(err);
 })

},
addDataToIDB: (payload, key, DBStore) =>{

let req = APP.db.transaction(DBStore, 'readwrite')
 .objectStore(DBStore)
 .put({results: payload, keyword: key}, key);

  req.onsuccess = (ev) =>{
    console.log('Object added to store')
  }

  req.onerror = (err) =>{
    console.warn(err);
    console.log('Object already exists')
  }
},
getDataFromIDB: (DBStore, key, cb, fetchData) => {
   let req = APP.db.transaction(DBStore, 'readonly')
    .objectStore(DBStore)
    .get(key);

  req.onsuccess = (ev) =>{
    // console.log(req.result);
    if(req.result) {
     APP.results = req.result['results'];
      cb(APP.results);
  } else {
    fetchData(key);
  }
  
  req.onerror = (err) =>{
    console.log('not found');
    console.warn(err);
  }
  
}
},
goneOnline: () => {
  APP.isOnline = true;
},
goneOffline: ()=>{
  APP.isOnline = false;
}
};
document.addEventListener('DOMContentLoaded', APP.init);
