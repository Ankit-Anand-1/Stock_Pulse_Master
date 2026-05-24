import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc,
  updateDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface Alert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
  createdAt: any;
}

interface AlertsContextType {
  alerts: Alert[];
  loading: boolean;
  addAlert: (symbol: string, targetPrice: number, condition: 'above' | 'below') => Promise<void>;
  toggleAlert: (id: string, active: boolean) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'alerts'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      setAlerts(docs);
      setLoading(false);
    }, (error) => {
      console.error("Alerts snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addAlert = async (symbol: string, targetPrice: number, condition: 'above' | 'below') => {
    if (!user) return;

    await addDoc(collection(db, 'alerts'), {
      userId: user.uid,
      symbol,
      targetPrice,
      condition,
      active: true,
      createdAt: serverTimestamp()
    });
  };

  const toggleAlert = async (id: string, active: boolean) => {
    const alertRef = doc(db, 'alerts', id);
    await updateDoc(alertRef, { active });
  };

  const removeAlert = async (id: string) => {
    await deleteDoc(doc(db, 'alerts', id));
  };

  return (
    <AlertsContext.Provider value={{ alerts, loading, addAlert, toggleAlert, removeAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
