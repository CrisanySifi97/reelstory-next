importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAuclxHuwcnEt9Pv6viXT7WKMOJVBtbQpk',
  authDomain:        'doramaangola.firebaseapp.com',
  projectId:         'doramaangola',
  storageBucket:     'doramaangola.firebasestorage.app',
  messagingSenderId: '920756571293',
  appId:             '1:920756571293:web:52b6d52d99a763effbd874',
});

const messaging = firebase.messaging();

// Handle background messages (app closed or in background)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'ReelStory';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  || '/icon-192.png';
  const url   = payload.data?.url || '/inicio';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/icon-192.png',
    data:  { url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  });
});

// Open URL when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/inicio';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
