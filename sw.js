
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCbjITpAZBfA-NItVOX6Hc3AJlet6EKk7E",
  authDomain: "eladwya-92754604-eb321.firebaseapp.com",
  projectId: "eladwya-92754604-eb321",
  storageBucket: "eladwya-92754604-eb321.firebasestorage.app",
  messagingSenderId: "319834803886",
  appId: "1:319834803886:web:6a71f628e1a20d01c5a73f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received:', payload);
  
  const title = payload.notification?.title || "تذكير صحتي 💊";
  const options = {
    body: payload.notification?.body || "حان موعد أدويتك الآن.",
    icon: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
    tag: 'medication-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: self.location.origin
    }
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});