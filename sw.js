
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
  
  const isTip = payload.data?.type === 'tip';
  const title = payload.notification?.title || "تذكير صحتي 💊";
  
  const options = {
    body: payload.notification?.body || "حان موعد أدويتك الآن.",
    icon: '/icon.png',
    badge: '/icon.png',
    tag: isTip ? 'health-tip' : 'medication-reminder',
    renotify: !isTip,
    silent: isTip,
    vibrate: isTip ? [] : [200, 100, 200],
    data: {
      url: self.location.origin,
      type: payload.data?.type
    }
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Pass the notification body to the app via query parameter
  const notificationBody = event.notification.body;
  const isTip = event.notification.data?.type === 'tip';
  
  const urlToOpen = new URL(self.location.origin);
  
  // Only add 'speak' param if it's NOT a tip
  if (notificationBody && !isTip) {
    urlToOpen.searchParams.set('speak', notificationBody);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If we find an open window, focus it and navigate it to the URL with params to trigger speech
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if (notificationBody && !isTip) {
                client.navigate(urlToOpen.toString());
            } else {
                // For tips, just focus without reloading/navigating if possible, or navigate to home
                // If we don't navigate, the 'speak' param won't be cleared or set. 
                // Ideally we just focus.
                client.focus(); 
            }
            return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen.toString());
    })
  );
});