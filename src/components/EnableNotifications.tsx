// src/components/EnableNotifications.tsx
import { useEffect, useState } from "react";
import { auth, requestNotificationPermission, onForegroundMessage } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function EnableNotifications() {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user ? user.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      console.log("Foreground message:", payload);
    });
    return unsub;
  }, []);

  if (!uid) return null;

  const handleClick = async () => {
    const token = await requestNotificationPermission(uid);
    if (token) console.log("FCM token saved for", uid);
    else console.error("Failed to get FCM token");
  };

  return <button onClick={handleClick}>Enable Notifications</button>;
}

