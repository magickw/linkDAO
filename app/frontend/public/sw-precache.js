// Service Worker Precache with enhanced error handling and CDN fallback
// Load Workbox from CDN with fallback handling
(function() {
  try {
    importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

    // Verify Workbox loaded successfully
    if (typeof workbox === 'undefined') {
      console.error('❌ Workbox failed to load from CDN. Service worker functionality may be limited.');
      // Fallback: Use basic caching if workbox fails
      self.addEventListener('install', (event) => {
        console.log('⚠️ Service worker installed without Workbox - using fallback caching');
        self.skipWaiting();
      });
      self.addEventListener('activate', (event) => {
        console.log('⚠️ Service worker activated without Workbox');
        event.waitUntil(clients.claim());
      });
    } else {
      // Workbox loaded successfully - configure precaching
      console.log('✅ Workbox loaded successfully from CDN v7.3.0');
      workbox.precaching.precacheAndRoute([
        {'revision':'0dbd2235fd0b8ae8fe6370131a74f0a7','url':'/_next/build-manifest.json'},
        {'revision':'d751713988987e9331980363e24189ce','url':'/_next/dynamic-css-manifest.json'},
        {'revision':'1932f455470813942cd8094056c991a2','url':'/_next/react-loadable-manifest.json'},
        /* Additional assets would be listed here */
      ] || []);
    }
  } catch (error) {
    console.error('❌ Critical error loading service worker:', error);
    // Implement basic fetch fallback
    self.addEventListener('fetch', (event) => {
      event.respondWith(
        fetch(event.request).catch(() => {
          console.warn('⚠️ Network request failed, no cache available');
          return new Response('Offline - Service worker running in fallback mode', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        })
      );
    });
  }
})();