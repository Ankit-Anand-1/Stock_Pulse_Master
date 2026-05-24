importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// These will be replaced by the build process or provided via a message
const firebaseConfig = {
  apiKey: "AIzaSyDeKTj0VbGQA6ZOHmzPvJZuC4YRsWqncAg",
  authDomain: "inspired-bit-tjlsj-5b6ee.firebaseapp.com",
  projectId: "inspired-bit-tjlsj-5b6ee",
  storageBucket: "inspired-bit-tjlsj-5b6ee.firebasestorage.app",
  messagingSenderId: "49724236906",
  appId: "1:49724236906:web:5db8553f69d6f26cf6d613",
  measurementId: "G-F7KQ0HEK55"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
