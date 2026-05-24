import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { formatCurrency, cn } from "../lib/utils";

interface StockChartProps {
  data: any[];
  isPositive: boolean;
  currency?: string;
  quote?: any;
}

export default function StockChart({ data, isPositive, currency = "USD", quote }: StockChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((d) => {
        const date = d.date ? new Date(d.date) : null;
        if (!date || isNaN(date.getTime())) return null;
        return {
          ...d,
          timestamp: format(date, "MMM dd"),
        };
      })
      .filter((d): d is any => d !== null);
  }, [data]);

  const gradientColor = isPositive ? "#22c55e" : "#ef4444";

  if (!chartData.length) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-muted/20">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] mb-3">Recently Unavailable</p>
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center border-b border-border/50 pb-1">
            <span className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">Last Price</span>
            <span className="text-xs font-mono font-bold text-foreground">{formatCurrency(quote?.regularMarketPrice, currency)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-1">
            <span className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">Day High</span>
            <span className="text-xs font-mono font-bold text-green-500/80">{formatCurrency(quote?.regularMarketDayHigh, currency)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-1">
            <span className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">Day Low</span>
            <span className="text-xs font-mono font-bold text-red-500/80">{formatCurrency(quote?.regularMarketDayLow, currency)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 60, left: 10, bottom: 30 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="currentColor"
              className="text-border"
              opacity={0.3}
            />
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
              minTickGap={60}
              dy={15}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
              domain={["auto", "auto"]}
              width={50}
              tickFormatter={(val) => 
                val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[160px]">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold tracking-widest">
                          {data.timestamp}
                        </span>
                        <div className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase",
                          (data.close >= data.open) ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {(data.close >= data.open) ? 'BULL' : 'BEAR'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-left">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase">Open</span>
                          <span className="text-[11px] font-mono font-medium text-foreground opacity-80">{formatCurrency(data.open, currency)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase">Close</span>
                          <span className="text-[11px] font-mono font-bold text-foreground">{formatCurrency(data.close, currency)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase opacity-60 text-green-500">High</span>
                          <span className="text-[11px] font-mono font-medium text-green-500/80">{formatCurrency(data.high, currency)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-muted-foreground uppercase opacity-60 text-red-500">Low</span>
                          <span className="text-[11px] font-mono font-medium text-red-500/80">{formatCurrency(data.low, currency)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={gradientColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorVal)"
              animationDuration={1000}
              strokeLinecap="round"
              activeDot={{ r: 4, strokeWidth: 0, fill: "#fff", className: "shadow-glow" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
