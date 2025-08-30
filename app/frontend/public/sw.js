const CACHE_NAME = 'web3-social-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';

// Request deduplication to prevent repeated failed requests
const pendingRequests = new Map();
const failedRequests = new Map();

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  // Add other critical static assets
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/posts',
  '/api/communities',
  '/api/users',
  '/api/feed'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with different strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isAPI(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (isNavigation(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache first strategy - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      updateCache(request, cacheName);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

// Network first strategy - for API calls with deduplication
async function networkFirst(request, cacheName) {
  const requestKey = `${request.method}:${request.url}`;
  
  // Check if request recently failed (within 30 seconds)
  const failedAt = failedRequests.get(requestKey);
  if (failedAt && Date.now() - failedAt < 30000) {
    console.log('Skipping recently failed request:', requestKey);
    return await getCachedResponse(request, cacheName);
  }
  
  // Check if request is already pending
  if (pendingRequests.has(requestKey)) {
    console.log('Request already pending, waiting for result:', requestKey);
    return await pendingRequests.get(requestKey);
  }
  
  // Create promise for this request
  const requestPromise = performNetworkRequest(request, cacheName, requestKey);
  pendingRequests.set(requestKey, requestPromise);
  
  try {
    const result = await requestPromise;
    pendingRequests.delete(requestKey);
    return result;
  } catch (error) {
    pendingRequests.delete(requestKey);
    throw error;
  }
}

async function performNetworkRequest(request, cacheName, requestKey) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      // Clear failed request record on success
      failedRequests.delete(requestKey);
    } else {
      // Mark as failed for non-OK responses
      failedRequests.set(requestKey, Date.now());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    // Mark request as failed to prevent immediate retries
    failedRequests.set(requestKey, Date.now());
    
    return await getCachedResponse(request, cacheName);
  }
}

async function getCachedResponse(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Add offline indicator to response
    const response = cachedResponse.clone();
    response.headers.set('X-Served-From', 'cache');
    return response;
  }
  
  // Return offline page for navigation requests
  if (isNavigation(request)) {
    return caches.match('/offline.html') || 
           new Response('You are offline', { status: 503 });
  }
  
  return new Response('Content not available offline', { status: 503 });
}

// Navigation handler - for page requests
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return dashboard as fallback for SPA
    return cache.match('/dashboard') || 
           cache.match('/') ||
           new Response('Offline', { status: 503 });
  }
}

// Background cache update
async function updateCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isImage(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/);
}

function isAPI(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

function isNavigation(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'post-sync') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'reaction-sync') {
    event.waitUntil(syncReactions());
  }
});

// Sync offline posts when back online
async function syncPosts() {
  try {
    const db = await openDB();
    const offlinePosts = await getOfflinePosts(db);
    
    for (const post of offlinePosts) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(post.data)
        });
        
        if (response.ok) {
          await removeOfflinePost(db, post.id);
          console.log('Synced offline post:', post.id);
        }
      } catch (error) {
        console.error('Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('Post sync failed:', error);
  }
}

// Sync offline reactions when back online
async function syncReactions() {
  try {
    const db = await openDB();
    const offlineReactions = await getOfflineReactions(db);
    
    for (const reaction of offlineReactions) {
      try {
        const response = await fetch(`/api/posts/${reaction.postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reaction.data)
        });
        
        if (response.ok) {
          await removeOfflineReaction(db, reaction.id);
          console.log('Synced offline reaction:', reaction.id);
        }
      } catch (error) {
        console.error('Failed to sync reaction:', error);
      }
    }
  } catch (error) {
    console.error('Reaction sync failed:', error);
  }
}

// IndexedDB helpers (simplified)
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineData', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('posts')) {
        db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('reactions')) {
        db.createObjectStore('reactions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflinePosts(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['posts'], 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getOfflineReactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reactions'], 'readonly');
    const store = transaction.objectStore('reactions');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeOfflinePost(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['posts'], 'readwrite');
    const store = transaction.objectStore('posts');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function removeOfflineReaction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reactions'], 'readwrite');
    const store = transaction.objectStore('reactions');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/dashboard';
  
  if (data.postId) {
    url = `/dashboard/post/${data.postId}`;
  } else if (data.communityId) {
    url = `/dashboard/community/${data.communityId}`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

console.log('Service Worker loaded');