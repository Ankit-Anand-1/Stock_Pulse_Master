import React, { useMemo, useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { usePortfolio } from '../contexts/PortfolioContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, cn } from '../lib/utils';
import { Loader2, TrendingUp, TrendingDown, Target, Wallet, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, ArrowLeft, Clock, History } from 'lucide-react';
import { motion } from 'motion/react';
import { CompanyLogo } from './CompanyLogo';

interface Transaction {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: any;
}

export default function PortfolioPerformance({ onBack }: { onBack?: () => void }) {
  const { user } = useAuth();
  const { holdings } = usePortfolio();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<Record<string, any[]>>({});
  const [timeRange, setTimeRange] = useState('1mo');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch transactions
        const q = query(
          collection(db, 'transactions'), 
          where('userId', '==', user.uid),
          orderBy('timestamp', 'asc')
        );
        const snapshot = await getDocs(q);
        const txData = snapshot.docs.map(doc => doc.data() as Transaction);
        setTransactions(txData);

        // Fetch histories for all symbols in transactions or holdings
        const symbols = Array.from(new Set([
          ...txData.map(t => t.symbol),
          ...holdings.map(h => h.symbol)
        ]));

        if (symbols.length > 0) {
          const symbolsParam = encodeURIComponent(symbols.join(','));
          const res = await fetch(`/api/stock/bulk/history?symbols=${symbolsParam}&range=${timeRange}`);
          if (res.ok) {
            const historyData = await res.json();
            setHistories(historyData);
          }
        }
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, timeRange]);

  const performanceData = useMemo(() => {
    if (Object.keys(histories).length === 0 || transactions.length === 0) return [];

    // Get all unique dates across all histories
    const allDates = new Set<string>();
    Object.values(histories).forEach(history => {
      history.forEach((d: any) => allDates.add(new Date(d.date).toISOString().split('T')[0]));
    });

    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      let totalValue = 0;
      let totalCostSnapshot = 0;

      // For each date, calculate the holdings and their value
      const datePriceMap: Record<string, number> = {};
      Object.entries(histories).forEach(([sym, history]) => {
        const entry = history.find((h: any) => new Date(h.date).toISOString().split('T')[0] === date);
        if (entry) datePriceMap[sym.toUpperCase()] = entry.close;
      });

      // Calculate quantity held at this date
      const snapshotDate = new Date(date).getTime();
      const currentQuantities: Record<string, number> = {};
      const dayTransactions: Transaction[] = [];

      transactions.forEach(tx => {
        const txDateObj = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(0);
        const txDateStr = txDateObj.toISOString().split('T')[0];
        const txTime = txDateObj.getTime();
        
        if (txTime <= snapshotDate) {
          const sym = tx.symbol.toUpperCase();
          if (!currentQuantities[sym]) {
            currentQuantities[sym] = 0;
          }
          if (tx.type === 'buy') {
            currentQuantities[sym] += tx.quantity;
          } else {
            currentQuantities[sym] -= tx.quantity;
          }
        }

        if (txDateStr === date) {
          dayTransactions.push(tx);
        }
      });

      Object.entries(currentQuantities).forEach(([sym, qty]) => {
        if (qty > 0 && datePriceMap[sym]) {
          totalValue += qty * datePriceMap[sym];
        }
      });

      return {
        date,
        value: totalValue,
        transactions: dayTransactions,
        hasTransactions: dayTransactions.length > 0
      };
    }).filter(d => d.value > 0);
  }, [histories, transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[200px]">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            {new Date(label).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono text-zinc-400">Portfolio Value</span>
            <span className="text-sm font-mono font-bold text-blue-400">{formatCurrency(data.value)}</span>
          </div>
          
          {data.transactions && data.transactions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase">Daily Activity</p>
              {data.transactions.map((tx: any, i: number) => (
                <div key={i} className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      tx.type === 'buy' ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-[10px] font-mono font-bold">{tx.symbol}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {tx.type === 'buy' ? '+' : '-'}{tx.quantity} @ {formatCurrency(tx.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.hasTransactions) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={4} 
          fill="#3b82f6" 
          stroke="#09090b" 
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  const AllocationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[180px]">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Asset Allocation
          </p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-mono font-bold text-zinc-100">{data.name}</span>
            <span className="text-[10px] font-mono font-bold text-blue-400">{percentage}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Market Value</span>
            <span className="text-xs font-mono font-bold text-zinc-100">{formatCurrency(data.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const holdingsWithPL = useMemo(() => {
    return holdings.map(h => {
      const sym = h.symbol.toUpperCase();
      const history = histories[sym];
      const currentPrice = history?.[history.length - 1]?.close || h.averagePrice;
      const totalCost = h.quantity * h.averagePrice;
      const currentValue = h.quantity * currentPrice;
      const gain = currentValue - totalCost;
      const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;
      
      return {
        ...h,
        currentPrice,
        currentValue,
        gain,
        gainPercent
      };
    }).sort((a, b) => b.currentValue - a.currentValue);
  }, [holdings, histories]);

  const contributionData = useMemo(() => {
    return holdingsWithPL.map(h => ({
      name: h.symbol,
      value: h.currentValue
    }));
  }, [holdingsWithPL]);

  const totalValue = holdingsWithPL.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalCost = holdingsWithPL.reduce((acc, h) => acc + (h.quantity * h.averagePrice), 0);
  const totalGain = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Reconstructing Portfolio History...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] text-center p-8">
        <Wallet className="w-12 h-12 text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Performance Data</h2>
        <p className="text-zinc-500 max-w-sm">Start trading to see your portfolio performance and analytics here.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Dashboard
            </button>
          )}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Portfolio Performance</h1>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Wealth & Analytics Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
          {['1wk', '1mo', '3mo', '1y', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
                timeRange === range ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-white"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Value</p>
            <h3 className="text-3xl font-mono font-bold">{formatCurrency(totalValue)}</h3>
            <div className="mt-4 flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono",
                totalGain >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {totalGain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatCurrency(Math.abs(totalGain))} ({gainPercent.toFixed(2)}%)
              </div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">ALL TIME</span>
            </div>
          </div>
          <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 text-zinc-800/10" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">Portfolio Cost</p>
            <h3 className="text-3xl font-mono font-bold">{formatCurrency(totalCost)}</h3>
            <p className="mt-4 text-[10px] font-mono text-zinc-500 uppercase">Capital Invested</p>
          </div>
          <Target className="absolute -bottom-4 -right-4 w-32 h-32 text-zinc-800/10" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">Number of Assets</p>
            <h3 className="text-3xl font-mono font-bold">{holdings.length}</h3>
            <p className="mt-4 text-[10px] font-mono text-zinc-500 uppercase">Active Holdings</p>
          </div>
          <BarChart3 className="absolute -bottom-4 -right-4 w-32 h-32 text-zinc-800/10" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Wealth Trajectory
            </h3>
          </div>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 20, right: 60, left: 10, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#18181b" vertical={false} opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={9} 
                  fontFamily="monospace"
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                  dy={15}
                  minTickGap={60}
                />
                <YAxis 
                  orientation="right"
                  stroke="#52525b" 
                  fontSize={9} 
                  fontFamily="monospace"
                  width={50}
                  tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val.toFixed(0)}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  dot={<CustomDot />}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 flex-1">
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              Allocation
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {contributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<AllocationTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-3">
              {contributionData.slice(0, 5).map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-mono text-xs font-bold">{entry.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">{((entry.value / totalValue) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Holdings Breakdown
              </h3>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {holdingsWithPL.map((h) => {
                const isPos = h.gain >= 0;
                
                return (
                  <div key={h.symbol} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/20 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <CompanyLogo symbol={h.symbol} size="md" className="rounded-xl" />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">{h.symbol}</span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{h.quantity} SHARES</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase">
                          <span>Avg: {formatCurrency(h.averagePrice)}</span>
                          <span>•</span>
                          <span>Now: {formatCurrency(h.currentPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-0.5">
                      <p className="font-mono text-xs font-bold text-foreground">{formatCurrency(h.currentValue)}</p>
                      <div className={cn(
                        "font-mono text-[9px] font-bold flex items-center justify-end gap-1",
                        isPos ? "text-green-500" : "text-red-500"
                      )}>
                        {isPos ? '+' : ''}{formatCurrency(h.gain)}
                        <span className="opacity-60">({h.gainPercent.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {holdingsWithPL.length === 0 && (
                <p className="text-center text-[10px] font-mono text-zinc-600 uppercase py-8">No active holdings</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-muted/10 border border-border rounded-3xl p-8"
      >
        <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-foreground">
          <History className="w-4 h-4 text-blue-500" />
          Transaction History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <th className="pb-4 font-bold">DATE</th>
                <th className="pb-4 font-bold text-left pl-4">SYMBOL</th>
                <th className="pb-4 font-bold text-center">TYPE</th>
                <th className="pb-4 font-bold text-right">QUANTITY</th>
                <th className="pb-4 font-bold text-right">PRICE</th>
                <th className="pb-4 font-bold text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...transactions].sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                return dateB - dateA;
              }).map((tx, idx) => {
                const date = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date();
                return (
                  <tr key={idx} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-4 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                      {date.toLocaleDateString()} <span className="opacity-40">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <CompanyLogo symbol={tx.symbol} size="sm" className="rounded-md" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold font-mono text-blue-500">{tx.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase",
                        tx.type === 'buy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 text-right text-xs font-mono text-foreground font-medium">{tx.quantity}</td>
                    <td className="py-4 text-right text-xs font-mono text-muted-foreground">{formatCurrency(tx.price)}</td>
                    <td className="py-4 text-right text-xs font-mono font-bold text-foreground">
                      {formatCurrency(tx.quantity * tx.price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No transactions found</p>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
