import React, { useMemo } from 'react';
import { ShieldCheck, Zap, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface RiskAnalysisProps {
  quote: any;
  history: any[];
}

export default function RiskAnalysis({ quote, history }: RiskAnalysisProps) {
  const analysis = useMemo(() => {
    if (!quote || !history || history.length === 0) return null;

    const changePercent = Math.abs(quote.regularMarketChangePercent || 0);
    
    // Calculate 30-day volatility (standard deviation of daily returns)
    // This is a simplified proxy
    const closes = history.map(h => h.close).filter(Boolean);
    if (closes.length < 2) return null;
    
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
        returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252) * 100; // Annualized volatility in %

    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    let label = 'Moderate';
    let type: 'SAFE' | 'NEUTRAL' | 'DANGER' = 'NEUTRAL';

    // Criteria for classification
    // Volatility < 20% -> Low/Safe
    // Volatility 20-40% -> Medium
    // Volatility 40-70% -> High/Danger
    // Volatility > 70% -> Extreme/Danger

    if (annualizedVol < 20) {
      riskLevel = 'low';
      label = 'Conservative / Safe';
      type = 'SAFE';
    } else if (annualizedVol < 45) {
      riskLevel = 'medium';
      label = 'Moderate';
      type = 'NEUTRAL';
    } else if (annualizedVol < 75) {
      riskLevel = 'high';
      label = 'High Volatility / Aggressive';
      type = 'DANGER';
    } else {
      riskLevel = 'extreme';
      label = 'Extreme Risk / Speculative';
      type = 'DANGER';
    }

    return {
      volatility: annualizedVol,
      riskLevel,
      label,
      type,
      stdDev
    };
  }, [quote, history]);

  if (!analysis) return null;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Zap className="w-3 h-3 text-amber-500" />
          Risk Profile Analysis
        </h3>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-widest uppercase border",
          analysis.type === 'SAFE' && "bg-green-500/10 text-green-400 border-green-500/20",
          analysis.type === 'NEUTRAL' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
          analysis.type === 'DANGER' && "bg-red-500/10 text-red-500 border-red-500/20",
        )}>
          {analysis.type}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xl font-mono font-bold tracking-tight">
          {analysis.label}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.min(100, (analysis.volatility / 100) * 100)}%`,
                backgroundColor: analysis.type === 'SAFE' ? '#10b981' : analysis.type === 'NEUTRAL' ? '#3b82f6' : '#ef4444'
              }}
              className="h-full"
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-500">{analysis.volatility.toFixed(1)}% VOL</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
          <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Stability</p>
          <div className="flex items-center gap-2">
            {analysis.type === 'SAFE' ? (
              <ShieldCheck className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-zinc-700" />
            )}
            <span className="text-xs font-mono font-bold uppercase truncate">
              {analysis.volatility < 30 ? 'High Stability' : 'Variable'}
            </span>
          </div>
        </div>
        <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
          <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Market Sentiment</p>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-700" />
            <span className="text-xs font-mono font-bold uppercase">
              {(quote.regularMarketChangePercent || 0) > 0 ? 'Bullish' : 'Bearish'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[9px] font-mono text-zinc-600 flex gap-2">
        <Info className="w-3 h-3 shrink-0" />
        <p className="uppercase leading-relaxed">
          Risk classification is based on historical price volatility (std dev) over the last 30 days. This is not financial advice.
        </p>
      </div>
    </div>
  );
}

import { Activity } from 'lucide-react';
