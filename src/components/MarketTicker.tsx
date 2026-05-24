import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../lib/utils";
import { CompanyLogo } from "./CompanyLogo";

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
}

const TICKER_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "BTC-USD", "ETH-USD", "GC=F", "CL=F"];

export default function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const symbolsParam = encodeURIComponent(TICKER_SYMBOLS.join(","));
        const res = await fetch(`/api/stock/bulk/quotes?symbols=${symbolsParam}`);
        if (!res.ok) throw new Error("Failed to fetch ticker");
        const results = await res.json();
        
        setItems(results.map((r: any) => ({
          symbol: r.symbol,
          price: r.regularMarketPrice,
          change: r.regularMarketChangePercent
        })));
      } catch (e) {
        console.error("Ticker fetch error", e);
      }
    };
    fetchTicker();
    const interval = setInterval(fetchTicker, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 h-10 z-50 overflow-hidden flex items-center">
      <div className="bg-blue-600 h-full flex items-center px-4 font-mono text-[10px] font-bold tracking-widest uppercase shrink-0 border-r border-blue-500 z-10 shadow-[4px_0_10px_rgba(37,99,235,0.3)]">
        Live Market
      </div>
      <div className="flex gap-12 animate-scroll pl-10 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-3 font-mono text-[11px]">
            <CompanyLogo symbol={item.symbol} size="sm" className="rounded-sm opacity-80" />
            <span className="font-bold text-zinc-300">{item.symbol}</span>
            <span className="font-medium">{item.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={cn(
              "flex items-center gap-0.5 font-bold",
              (item.change || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {(item.change || 0) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {Math.abs(item.change || 0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
