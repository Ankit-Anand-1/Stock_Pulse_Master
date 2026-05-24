importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// These will be replaced by the build process or provided via a message
const firebaseConfig = {
  projectId: "inspired-bit-tjlsj",
  appId: "1:581885774772:web:060ab2ceee82dbac45c0e1",
  apiKey: "AIzaSyDRygshEvlEgxpPD1Fm1lB1X05XTTQf10s",
  authDomain: "inspired-bit-tjlsj.firebaseapp.com",
  storageBucket: "inspired-bit-tjlsj.firebasestorage.app",
  messagingSenderId: "581885774772"
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
