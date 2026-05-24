import React, { useState, useEffect, useMemo } from "react";
import { 
  Filter, 
  Search, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  ChevronDown,
  Info
} from "lucide-react";
import { POPULAR_SYMBOLS } from "../constants";
import { StockQuote } from "../types";
import { formatCurrency, formatCompactNumber, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { CompanyLogo } from "./CompanyLogo";

interface ScreenerFilters {
  marketCap: "all" | "mega" | "large" | "mid" | "small";
  peRatio: "all" | "low" | "mid" | "high";
  volatility: "all" | "low" | "medium" | "high";
  searchQuery: string;
}

export default function StockScreener({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ScreenerFilters>({
    marketCap: "all",
    peRatio: "all",
    volatility: "all",
    searchQuery: ""
  });

  useEffect(() => {
    const fetchScreenerData = async () => {
      setLoading(true);
      try {
        const symbolsParam = encodeURIComponent(POPULAR_SYMBOLS.join(","));
        const res = await fetch(`/api/stock/bulk/quotes?symbols=${symbolsParam}`);
        if (!res.ok) throw new Error("Failed to fetch screener data");
        const data = await res.json();
        setStocks(data.filter((q: any) => q && q.symbol));
      } catch (error) {
        console.error("Screener fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScreenerData();
  }, []);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      // Search Filter
      const matchesSearch = s.symbol.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                           (s.shortName?.toLowerCase().includes(filters.searchQuery.toLowerCase()) || false);
      if (!matchesSearch) return false;

      // Market Cap Filter
      if (filters.marketCap !== "all") {
        const cap = s.marketCap || 0;
        if (filters.marketCap === "mega" && cap < 200000000000) return false;
        if (filters.marketCap === "large" && (cap < 10000000000 || cap >= 200000000000)) return false;
        if (filters.marketCap === "mid" && (cap < 2000000000 || cap >= 10000000000)) return false;
        if (filters.marketCap === "small" && cap >= 2000000000) return false;
      }

      // P/E Ratio Filter
      if (filters.peRatio !== "all") {
        const pe = s.trailingPE || 0;
        if (filters.peRatio === "low" && pe > 15) return false;
        if (filters.peRatio === "mid" && (pe <= 15 || pe > 30)) return false;
        if (filters.peRatio === "high" && pe <= 30) return false;
      }

      // Volatility (Beta as proxy)
      if (filters.volatility !== "all") {
        const beta = s.beta || 1;
        if (filters.volatility === "low" && beta >= 0.8) return false;
        if (filters.volatility === "medium" && (beta < 0.8 || beta > 1.2)) return false;
        if (filters.volatility === "high" && beta <= 1.2) return false;
      }

      return true;
    });
  }, [stocks, filters]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold font-mono tracking-tight uppercase flex items-center gap-2 text-blue-500">
            <Filter className="w-5 h-5" />
            Stock Screener
          </h2>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
            Filter through {stocks.length} top market assets
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="QUICK SEARCH..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-[10px] font-mono focus:outline-hidden focus:border-blue-500/50 transition-all uppercase"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/10 border border-border rounded-2xl p-4">
        <FilterSelect 
          label="Market Cap" 
          value={filters.marketCap}
          options={[
            { label: "All Caps", value: "all" },
            { label: "Mega (> 200B)", value: "mega" },
            { label: "Large (10B - 200B)", value: "large" },
            { label: "Mid (2B - 10B)", value: "mid" },
            { label: "Small (< 2B)", value: "small" },
          ]}
          onChange={(val) => setFilters(prev => ({ ...prev, marketCap: val as any }))}
        />
        <FilterSelect 
          label="P/E Ratio" 
          value={filters.peRatio}
          options={[
            { label: "Any P/E", value: "all" },
            { label: "Value (< 15)", value: "low" },
            { label: "Fair (15 - 30)", value: "mid" },
            { label: "Growth (> 30)", value: "high" },
          ]}
          onChange={(val) => setFilters(prev => ({ ...prev, peRatio: val as any }))}
        />
        <FilterSelect 
          label="Volatility (Beta)" 
          value={filters.volatility}
          options={[
            { label: "Any Beta", value: "all" },
            { label: "Low (< 0.8)", value: "low" },
            { label: "Market (0.8 - 1.2)", value: "medium" },
            { label: "High (> 1.2)", value: "high" },
          ]}
          onChange={(val) => setFilters(prev => ({ ...prev, volatility: val as any }))}
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Scanning Markets...</p>
        </div>
      ) : filteredStocks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredStocks.map((s) => (
              <motion.button
                key={s.symbol}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => onSelect(s.symbol)}
                className="group p-5 bg-muted/10 border border-border rounded-2xl flex flex-col text-left hover:border-blue-500/30 transition-all hover:bg-muted/20 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CompanyLogo symbol={s.symbol} size="md" className="rounded-lg shadow-sm" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold font-mono tracking-widest text-blue-500">{s.symbol}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase truncate max-w-[120px]">{s.shortName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold">{formatCurrency(s.regularMarketPrice)}</p>
                    <div className={cn(
                      "text-[9px] font-mono font-bold flex items-center justify-end gap-1",
                      (s.regularMarketChangePercent || 0) >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {(s.regularMarketChangePercent || 0) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {s.regularMarketChangePercent?.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">Market Cap</span>
                    <span className="text-[10px] font-mono font-bold">{formatCompactNumber(s.marketCap)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">P/E Ratio</span>
                    <span className="text-[10px] font-mono font-bold">{s.trailingPE?.toFixed(2) || "N/A"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">Beta</span>
                    <span className="text-[10px] font-mono font-bold">{s.beta?.toFixed(2) || "1.00"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest">Volume</span>
                    <span className="text-[10px] font-mono font-bold">{formatCompactNumber(s.regularMarketVolume)}</span>
                  </div>
                </div>

                <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-10 transition-opacity">
                  <ArrowUpRight className="w-16 h-16" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl text-center">
          <Search className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            No matches found for current filters
          </p>
          <button 
            onClick={() => setFilters({ marketCap: "all", peRatio: "all", volatility: "all", searchQuery: "" })}
            className="mt-4 text-xs font-mono text-blue-500 hover:underline underline-offset-4"
          >
            RESET ALL FILTERS
          </button>
        </div>
      )}

      <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground font-mono uppercase leading-relaxed">
          The screener uses real-time data for a curated list of {stocks.length} major market indices and highly liquid equities. 
          Beta is used as a proxy for volatility relative to the market benchmark.
        </p>
      </div>
    </div>
  );
}

function FilterSelect({ 
  label, 
  value, 
  options, 
  onChange 
}: { 
  label: string; 
  value: string; 
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-background border border-border p-2 pr-8 rounded-xl text-[10px] font-mono uppercase tracking-wider focus:outline-hidden focus:border-blue-500/50 transition-colors"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  );
}
