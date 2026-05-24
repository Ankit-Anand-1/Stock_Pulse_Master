import React from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import { StockQuote } from "../types";
import { formatCurrency, formatCompactNumber, cn } from "../lib/utils";
import StockChart from "./StockChart";
import { CompanyLogo } from "./CompanyLogo";

interface CompareViewProps {
  symbols: string[];
  quotes: Record<string, StockQuote>;
  histories: Record<string, any[]>;
  onRemove: (symbol: string) => void;
  loading: boolean;
}

export default function CompareView({ symbols, quotes, histories, onRemove, loading }: CompareViewProps) {
  if (symbols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-3xl text-zinc-500 font-mono">
        <p className="uppercase tracking-widest text-xs">Comparison list is empty</p>
        <p className="text-[10px] mt-2 opacity-50 uppercase">Search and add stocks to compare them here</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4",
      symbols.length === 1 ? "grid-cols-1" : 
      symbols.length === 2 ? "grid-cols-1 lg:grid-cols-2" : 
      "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
    )}>
      {symbols.map((symbol) => {
        const quote = quotes[symbol];
        const history = histories[symbol] || [];
        const isPositive = (quote?.regularMarketChangePercent || 0) >= 0;

        return (
          <motion.div
            key={symbol}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 relative group flex flex-col"
          >
            <button
              onClick={() => onRemove(symbol)}
              className="absolute top-4 right-4 w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <CompanyLogo symbol={symbol} size="md" className="rounded-lg shadow-sm" />
                <div>
                  <h3 className="text-xl font-bold font-mono tracking-tighter">{symbol}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase truncate max-w-[150px]">
                    {quote?.shortName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono leading-none">
                  {formatCurrency(quote?.regularMarketPrice, quote?.currency)}
                </p>
                <div className={cn(
                  "flex items-center justify-end gap-1 text-[10px] font-bold font-mono mt-1",
                  isPositive ? "text-green-500" : "text-red-500"
                )}>
                  {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {quote?.regularMarketChangePercent?.toFixed(2)}%
                </div>
                {quote?.regularMarketChangePercent && (
                  <div className={cn(
                    "text-[8px] font-mono font-black mt-1 px-1.5 py-0.5 rounded inline-block",
                    Math.abs(quote.regularMarketChangePercent) < 1.5 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {Math.abs(quote.regularMarketChangePercent) < 1.5 ? "SAFE" : "DANGER"}
                  </div>
                )}
              </div>
            </div>

            <div className="h-40 w-full mb-4 bg-zinc-950/30 rounded-xl overflow-hidden border border-zinc-800/50">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <StockChart data={history} isPositive={isPositive} currency={quote?.currency} quote={quote} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-zinc-800/50">
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-600 uppercase font-mono tracking-widest">Cap</span>
                <span className="text-xs font-mono font-bold">{formatCompactNumber(quote?.marketCap)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-600 uppercase font-mono tracking-widest">Vol</span>
                <span className="text-xs font-mono font-bold">{formatCompactNumber(quote?.regularMarketVolume)}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
