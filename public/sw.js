// TruyenCity Service Worker
// Supports: Background Sync, Push Notifications, Offline Caching

const CACHE_NAME = 'truyencity-v1';
const STATIC_ASSETS = [
  '/',
  '/browse',
  '/ranking',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Background sync queue name
const SYNC_QUEUE = 'ai-writer-sync';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache assets individually to avoid failing entire install if one asset fails
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - we want them to always go to network
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache for offline
        return caches.match(event.request);
      })
  );
});

// Background Sync for AI Writing Jobs
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-writing-jobs') {
    event.waitUntil(syncWritingJobs());
  }
});

async function syncWritingJobs() {
  try {
    // Get pending jobs from IndexedDB
    const pendingJobs = await getPendingJobsFromDB();

    for (const job of pendingJobs) {
      try {
        const response = await fetch('/api/ai-writer/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${job.token}`,
          },
          body: JSON.stringify({ projectId: job.projectId }),
        });

        if (response.ok) {
          await removeJobFromDB(job.id);
          await showNotification('Viết chương thành công', {
            body: `Đã hoàn thành viết chương cho dự án`,
            tag: 'writing-complete',
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync job:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = { title: 'TruyenCity', body: 'Bạn có thông báo mới' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Mở ứng dụng' },
      { action: 'close', title: 'Đóng' },
    ],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/admin/ai-writer';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      return clients.openWindow(urlToOpen);
    })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'QUEUE_WRITING_JOB') {
    queueWritingJob(event.data.payload);
  }

  if (event.data.type === 'CHECK_JOB_STATUS') {
    checkJobStatus(event.data.payload);
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Queue a writing job for background sync
async function queueWritingJob(job) {
  try {
    await addJobToDB(job);

    // Register for background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-writing-jobs');
    }

    // Notify client
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'JOB_QUEUED',
        payload: { jobId: job.id },
      });
    });
  } catch (error) {
    console.error('[SW] Failed to queue job:', error);
  }
}

// Check status of a job
async function checkJobStatus(payload) {
  try {
    const response = await fetch(`/api/ai-writer/jobs/${payload.jobId}`, {
      headers: {
        'Authorization': `Bearer ${payload.token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'JOB_STATUS_UPDATE',
          payload: data,
        });
      });
    }
  } catch (error) {
    console.error('[SW] Failed to check job status:', error);
  }
}

// Periodic background sync for long-running jobs
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-writing-jobs') {
    event.waitUntil(checkAllPendingJobs());
  }
});

async function checkAllPendingJobs() {
  const jobs = await getPendingJobsFromDB();
  for (const job of jobs) {
    await checkJobStatus({ jobId: job.id, token: job.token });
  }
}

// IndexedDB helpers for storing pending jobs
const DB_NAME = 'truyencity-sw';
const STORE_NAME = 'pending-jobs';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function addJobToDB(job) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(job);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getPendingJobsFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function removeJobFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Helper to show notification
async function showNotification(title, options) {
  if (Notification.permission === 'granted') {
    await self.registration.showNotification(title, options);
  }
}

console.log('[SW] Service Worker loaded');
