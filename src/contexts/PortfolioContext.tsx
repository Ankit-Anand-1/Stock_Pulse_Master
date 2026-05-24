import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { StockProfile } from '../types';

interface Holding {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  updatedAt: any;
}

interface PortfolioContextType {
  holdings: Holding[];
  loading: boolean;
  buyStock: (symbol: string, quantity: number, price: number) => Promise<void>;
  sellStock: (symbol: string, quantity: number, price: number) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'portfolios'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holding));
      setHoldings(docs);
      setLoading(false);
    }, (error) => {
      console.error("Portfolio snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const buyStock = async (symbol: string, quantity: number, price: number) => {
    if (!user) return;

    const portfolioId = `${user.uid}_${symbol}`;
    const holdingRef = doc(db, 'portfolios', portfolioId);
    
    // Find existing holding
    const existing = holdings.find(h => h.symbol === symbol);
    
    const batch = writeBatch(db);

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      const newAveragePrice = ((existing.averagePrice * existing.quantity) + (price * quantity)) / newQuantity;
      
      batch.set(holdingRef, {
        userId: user.uid,
        symbol,
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(holdingRef, {
        userId: user.uid,
        symbol,
        quantity,
        averagePrice: price,
        updatedAt: serverTimestamp()
      });
    }

    // Add transaction
    const transactionRef = doc(collection(db, 'transactions'));
    batch.set(transactionRef, {
      userId: user.uid,
      symbol,
      type: 'buy',
      quantity,
      price,
      timestamp: serverTimestamp()
    });

    await batch.commit();
  };

  const sellStock = async (symbol: string, quantity: number, price: number) => {
    if (!user) return;

    const portfolioId = `${user.uid}_${symbol}`;
    const holdingRef = doc(db, 'portfolios', portfolioId);
    
    const existing = holdings.find(h => h.symbol === symbol);
    if (!existing || existing.quantity < quantity) {
      throw new Error("Insufficient shares to sell");
    }

    const batch = writeBatch(db);
    const newQuantity = existing.quantity - quantity;

    if (newQuantity === 0) {
      batch.delete(holdingRef);
    } else {
      batch.set(holdingRef, {
        ...existing,
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });
    }

    // Add transaction
    const transactionRef = doc(collection(db, 'transactions'));
    batch.set(transactionRef, {
      userId: user.uid,
      symbol,
      type: 'sell',
      quantity,
      price,
      timestamp: serverTimestamp()
    });

    await batch.commit();
  };

  return (
    <PortfolioContext.Provider value={{ holdings, loading, buyStock, sellStock }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
