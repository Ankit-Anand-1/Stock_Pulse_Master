import React, { useState } from 'react';
import { useAlerts, Alert } from '../contexts/AlertsContext';
import { useAuth } from '../contexts/AuthContext';
import { Bell, BellOff, Trash2, Plus, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

interface AlertsSectionProps {
  symbol: string;
  currentPrice: number;
}

export default function AlertsSection({ symbol, currentPrice }: AlertsSectionProps) {
  const { user } = useAuth();
  const { alerts, addAlert, toggleAlert, removeAlert, loading } = useAlerts();
  
  const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isAdding, setIsAdding] = useState(false);

  const symbolAlerts = alerts.filter(a => a.symbol === symbol);

  const handleAdd = async () => {
    if (!user) return;
    setIsAdding(true);
    try {
      await addAlert(symbol, parseFloat(targetPrice), condition);
      setTargetPrice(currentPrice.toString());
    } catch (error) {
      console.error("Failed to add alert:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-500" />
          Price Alerts
        </h3>
      </div>

      <div className="space-y-6">
        {/* Add Alert Form */}
        <div className="flex flex-col gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Target Price</label>
              <input 
                type="number" 
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                step="0.01"
              />
            </div>
            <div className="w-32">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Condition</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none uppercase"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
          </div>
          <button 
            onClick={handleAdd}
            disabled={isAdding || !targetPrice}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Set Alert
          </button>
        </div>

        {/* Alerts List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {symbolAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  alert.active ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-950/30 border-zinc-900 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    alert.condition === 'above' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {alert.condition === 'above' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold">{formatCurrency(alert.targetPrice)}</p>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">
                      {alert.condition === 'above' ? 'Notify when price goes above' : 'Notify when price goes below'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAlert(alert.id, !alert.active)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      alert.active ? "text-yellow-500 hover:bg-yellow-500/10" : "text-zinc-500 hover:bg-zinc-500/10"
                    )}
                  >
                    {alert.active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => removeAlert(alert.id)}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {symbolAlerts.length === 0 && !loading && (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
              <p className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
                No active alerts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
