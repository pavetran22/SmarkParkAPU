// Firebase Cloud Messaging Web Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDummyKeyReplaceWithConfig",
  authDomain: "smartpark-ai-web.firebaseapp.com",
  projectId: "smartpark-ai-web",
  storageBucket: "smartpark-ai-web.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123def456"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  const notificationTitle = payload.notification ? payload.notification.title : 'SmartPark APU Alert';
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : 'You have a new parking update.',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
