/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAqgFzcoHBdfgc_YLRi3OGQrYIYWbLhQq0',
  authDomain: 'mysubitoclient.firebaseapp.com',
  projectId: 'mysubitoclient',
  storageBucket: 'mysubitoclient.firebasestorage.app',
  messagingSenderId: '535843022839',
  appId: '1:535843022839:web:0ad2745dd8847ba34430f2',
});

const messaging = firebase.messaging();

// Background message handler (onglet inactif ou fermé)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Message reçu en background:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Subito Business';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/logo-subito.jpeg',
    badge: '/logo-subito.jpeg',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/dashboard';

  if (data.type === 'ticket' || data.type === 'ticket_message') {
    url = data.ticketId ? `/tickets/${data.ticketId}` : '/tickets';
  }

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
