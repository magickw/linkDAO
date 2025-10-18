// Admin Service Worker for Push Notifications
const CACHE_NAME = 'admin-notifications-v1';
const urlsToCache = [
  '/icons/admin-badge.png',
  '/icons/shield.png',
  '/icons/system.png',
  '/icons/security.png',
  '/icons/user.png',
  '/icons/seller.png',
  '/icons/dispute.png',
  '/icons/review.png',
  '/icons/dismiss.png',
  '/icons/investigate.png',
  '/icons/check.png',
  '/icons/block.png',
  '/icons/assign.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData = {
        title: 'Admin Notification',
        body: event.data.text() || 'You have a new admin notification'
      };
    }
  }

  const {
    title = 'Admin Notification',
    body = 'You have a new notification',
    icon = '/icons/admin-badge.png',
    badge = '/icons/admin-badge.png',
    tag = 'admin-notification',
    data = {},
    requireInteraction = false,
    actions = [],
    vibrate = [100, 50, 100]
  } = notificationData;

  const options = {
    body,
    icon,
    badge,
    tag,
    data,
    requireInteraction,
    actions,
    vibrate,
    silent: false,
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  // Handle notification actions
  if (action) {
    handleNotificationAction(action, data);
  } else {
    // Handle notification click (no specific action)
    handleNotificationClick(data);
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    // Send analytics event
    trackNotificationDismissal(data);
  }
});

// Handle notification click
function handleNotificationClick(data) {
  const { type, category } = data;
  
  // Determine the URL to open based on notification type
  let url = '/admin';
  
  switch (type) {
    case 'moderation_queue':
      url = '/admin/moderation';
      break;
    case 'system_alert':
      url = '/admin/system';
      break;
    case 'security_alert':
      url = '/admin/security';
      break;
    case 'dispute_alert':
      url = '/admin/disputes';
      break;
    case 'user_management':
      url = '/admin/users';
      break;
    case 'seller_application':
      url = '/admin/sellers';
      break;
    default:
      if (category) {
        url = `/admin/${category}`;
      }
  }
  
  // Open or focus the admin page
  clients.matchAll({ type: 'window' }).then((clientList) => {
    // Check if admin page is already open
    for (const client of clientList) {
      if (client.url.includes('/admin') && 'focus' in client) {
        client.focus();
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          data: data,
          url: url
        });
        return;
      }
    }
    
    // Open new admin page
    if (clients.openWindow) {
      clients.openWindow(url);
    }
  });
}

// Handle notification actions
function handleNotificationAction(action, data) {
  console.log('Notification action:', action, data);
  
  switch (action) {
    case 'review':
      handleReviewAction(data);
      break;
    case 'dismiss':
      handleDismissAction(data);
      break;
    case 'investigate':
      handleInvestigateAction(data);
      break;
    case 'acknowledge':
      handleAcknowledgeAction(data);
      break;
    case 'block':
      handleBlockAction(data);
      break;
    case 'assign':
      handleAssignAction(data);
      break;
    default:
      console.warn('Unknown notification action:', action);
  }
}

function handleReviewAction(data) {
  const { type, disputeId } = data;
  let url = '/admin';
  
  if (type === 'moderation_queue') {
    url = '/admin/moderation';
  } else if (type === 'dispute_alert' && disputeId) {
    url = `/admin/disputes/${disputeId}`;
  }
  
  openAdminPage(url, { action: 'review', data });
}

function handleDismissAction(data) {
  // Just close the notification - no further action needed
  console.log('Notification dismissed:', data);
}

function handleInvestigateAction(data) {
  const url = data.type === 'security_alert' ? '/admin/security' : '/admin/system';
  openAdminPage(url, { action: 'investigate', data });
}

function handleAcknowledgeAction(data) {
  // Send acknowledgment to server
  fetch('/api/admin/notifications/acknowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notificationId: data.notificationId,
      timestamp: Date.now()
    })
  }).catch(error => {
    console.error('Failed to acknowledge notification:', error);
  });
}

function handleBlockAction(data) {
  // Handle security blocking action
  const url = '/admin/security';
  openAdminPage(url, { action: 'block', data });
}

function handleAssignAction(data) {
  const { disputeId } = data;
  const url = disputeId ? `/admin/disputes/${disputeId}/assign` : '/admin/disputes';
  openAdminPage(url, { action: 'assign', data });
}

function openAdminPage(url, messageData) {
  clients.matchAll({ type: 'window' }).then((clientList) => {
    // Check if admin page is already open
    for (const client of clientList) {
      if (client.url.includes('/admin') && 'focus' in client) {
        client.focus();
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          ...messageData,
          url: url
        });
        return;
      }
    }
    
    // Open new admin page
    if (clients.openWindow) {
      clients.openWindow(url);
    }
  });
}

function trackNotificationDismissal(data) {
  // Send analytics event for notification dismissal
  fetch('/api/admin/analytics/notification-dismissed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notificationId: data.notificationId,
      category: data.category,
      priority: data.priority,
      timestamp: Date.now()
    })
  }).catch(error => {
    console.error('Failed to track notification dismissal:', error);
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'admin-notification-actions') {
    event.waitUntil(syncNotificationActions());
  }
});

function syncNotificationActions() {
  // Sync any pending notification actions when back online
  return new Promise((resolve) => {
    // Implementation for syncing offline actions
    console.log('Syncing notification actions...');
    resolve();
  });
}

// Message handling from admin pages
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_NOTIFICATIONS':
      clearAllNotifications();
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

function clearAllNotifications() {
  self.registration.getNotifications().then((notifications) => {
    notifications.forEach((notification) => {
      notification.close();
    });
  });
}