import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Use a placeholder public VAPID key if not provided in config
// In a real app, this comes from the Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
const VAPID_KEY = "BEcQlwi3ZXSWDrERddzR0ghNTune09Kq8dUPbeHhWD6yLhqHGaxHG90UOw8wR0nXwfSp-N6Nuj5y1p5fbr5Z8R8"; // Ideally user provides this

export async function requestNotificationPermission(userId: string) {
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await updateDoc(doc(db, 'users', userId), {
          fcmToken: token
        });
        return token;
      }
    }
  } catch (error) {
    console.error("FCM Permission error:", error);
  }
  return null;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (error) {
    console.error("FCM Registration error:", error);
  }
}

// Connectivity check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}
