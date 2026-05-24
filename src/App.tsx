import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Activity, 
  Globe, 
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  PieChart,
  LayoutDashboard,
  Plus,
  ArrowLeftRight,
  Download,
  LogIn,
  LogOut,
  User as UserIcon,
  Wallet,
  ShoppingCart,
  Minus,
  ArrowLeft,
  BrainCircuit,
  Sun,
  Moon,
  Filter,
  Menu as MenuIcon,
  X,
  Settings,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StockQuote, ChartDataPoint, StockProfile } from "./types";
import { formatCurrency, formatCompactNumber, cn } from "./lib/utils";
import SearchBar from "./components/SearchBar";
import StockChart from "./components/StockChart";
import SentimentModule from "./components/SentimentModule";
import CompareView from "./components/CompareView";
import NewsSection from "./components/NewsSection";
import MarketTicker from "./components/MarketTicker";
import AlertsSection from "./components/AlertsSection";
import PortfolioPerformance from "./components/PortfolioPerformance";
import RiskAnalysis from "./components/RiskAnalysis";
import StockScreener from "./components/StockScreener";
import { CompanyLogo } from "./components/CompanyLogo";
import { BullIcon, BearIcon } from "./components/BullBearIcons";
import { useAuth } from "./contexts/AuthContext";
import { usePortfolio } from "./contexts/PortfolioContext";
import { requestNotificationPermission, onForegroundMessage } from "./lib/firebase";

const WATCHLIST_DEFAULT = ["AAPL", "GOOGL", "TSLA", "BTC-USD"];

export default function App() {
  const { user, signIn, logout } = useAuth();
  const { holdings, buyStock, sellStock, loading: portfolioLoading } = usePortfolio();

  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [profile, setProfile] = useState<StockProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1mo");
  const [serverError, setServerError] = useState<string | null>(null);

  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Notifications
  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
      const unsubscribe = onForegroundMessage((payload) => {
        console.log("Foreground message:", payload);
        // We could show a toast here
        setTradeMessage({ text: `ALERT: ${payload.notification.title} - ${payload.notification.body}`, type: 'success' });
        setTimeout(() => setTradeMessage(null), 10000);
      });
      return () => unsubscribe?.();
    }
  }, [user]);

  // Comparison State
  const [compareSymbols, setCompareSymbols] = useState<string[]>(["AAPL", "MSFT", "GOOGL"]);
  const [compareQuotes, setCompareQuotes] = useState<Record<string, StockQuote>>({});
  const [compareHistories, setCompareHistories] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<"single" | "compare" | "portfolio" | "screener">("single");
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    // Simple US market state check (approx 9:30 - 16:00 ET)
    const checkMarket = () => {
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      const etHour = (hour - 4 + 24) % 24; // EDT
      
      const open = day >= 1 && day <= 5 && (etHour > 9 || (etHour === 9 && minute >= 30)) && etHour < 16;
      setIsMarketOpen(open);
    };
    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (symbol: string) => {
    setLoading(true);
    setServerError(null);
    try {
      const [quoteRes, historyRes, profileRes] = await Promise.all([
        fetch(`/api/stock/${symbol}`),
        fetch(`/api/stock/${symbol}/history?range=${range}`),
        fetch(`/api/stock/${symbol}/profile`),
      ]);
      
      if (!quoteRes.ok || !historyRes.ok) {
        throw new Error("Service connection failed");
      }

      const quoteData = await quoteRes.json();
      const historyData = await historyRes.json();
      const profileData = await profileRes.ok ? await profileRes.json() : null;
      
      if (quoteData.error) throw new Error(quoteData.error);
      
      setQuote(quoteData);
      setHistory(historyData?.quotes || []);
      setProfile(profileData);
    } catch (error: any) {
      console.error("Fetch error:", error);
      setServerError(error.message === "Failed to fetch" 
        ? "Backend server unreachable. If deployed to Netlify, pleas ensure the backend is also running on a support platform." 
        : error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`/api/stock/bulk/quotes?symbols=${WATCHLIST_DEFAULT.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      const results = await res.json();
      // Filter out invalid results that might not have a symbol (e.g. error responses)
      setWatchlistQuotes(results.filter((q: any) => q && q.symbol));
      setServerError(null);
    } catch (error: any) {
      console.error("Watchlist fetch error:", error);
      if (error.message === "Failed to fetch") {
        setServerError("Backend connection lost.");
      }
    }
  };

  useEffect(() => {
    fetchData(selectedSymbol);
  }, [selectedSymbol, range]);

  useEffect(() => {
    const fetchCompareData = async () => {
      if (compareSymbols.length === 0) return;
      setCompareLoading(true);
      try {
        const symbolsQuery = compareSymbols.join(",");
        const [quotesRes, historyRes] = await Promise.all([
          fetch(`/api/stock/bulk/quotes?symbols=${symbolsQuery}`).then(async r => r.ok ? r.json() : []).catch(err => {
            console.error("Bulk quotes fetch failed:", err);
            return [];
          }),
          fetch(`/api/stock/bulk/history?symbols=${symbolsQuery}&range=${range}`).then(async r => r.ok ? r.json() : {}).catch(err => {
            console.error("Bulk history fetch failed:", err);
            return {};
          })
        ]);
        
        const quotesMap: Record<string, StockQuote> = {};
        if (Array.isArray(quotesRes)) {
          quotesRes.forEach((q: any) => { 
            if (q && q.symbol) {
              quotesMap[q.symbol.toUpperCase()] = q; 
            }
          });
        }
        
        // Normalize histories keys to uppercase
        const histories: Record<string, any[]> = {};
        if (historyRes && typeof historyRes === 'object' && !historyRes.error) {
          Object.entries(historyRes).forEach(([sym, data]) => {
            histories[sym.toUpperCase()] = data as any[];
          });
        }
        
        setCompareQuotes(quotesMap);
        setCompareHistories(histories);
      } catch (error) {
        console.error("Comparison fetch error:", error);
      } finally {
        setCompareLoading(false);
      }
    };

    if (viewMode === "compare") {
      fetchCompareData();
    }
  }, [compareSymbols, range, viewMode]);

  useEffect(() => {
    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 60000); // Update watchlist every minute
    return () => clearInterval(interval);
  }, []);

  const addToCompare = (symbol: string) => {
    const s = symbol.toUpperCase();
    if (!compareSymbols.includes(s)) {
      setCompareSymbols(prev => [...prev, s]);
    }
    setViewMode("compare");
  };

  const removeFromCompare = (symbol: string) => {
    setCompareSymbols(prev => prev.filter(s => s !== symbol));
  };

  const isPositive = (quote?.regularMarketChangePercent || 0) >= 0;

  const handleBuy = async () => {
    if (!user) {
      signIn();
      return;
    }
    if (!quote) return;
    
    setTradeLoading(true);
    setTradeMessage(null);
    try {
      await buyStock(quote.symbol, tradeQuantity, quote.regularMarketPrice);
      setTradeMessage({ text: `Successfully bought ${tradeQuantity} shares of ${quote.symbol}`, type: 'success' });
      setTimeout(() => setTradeMessage(null), 3000);
    } catch (error: any) {
      setTradeMessage({ text: error.message || "Failed to buy stock", type: 'error' });
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user) {
      signIn();
      return;
    }
    if (!quote) return;
    
    setTradeLoading(true);
    setTradeMessage(null);
    try {
      await sellStock(quote.symbol, tradeQuantity, quote.regularMarketPrice);
      setTradeMessage({ text: `Successfully sold ${tradeQuantity} shares of ${quote.symbol}`, type: 'success' });
      setTimeout(() => setTradeMessage(null), 3000);
    } catch (error: any) {
      setTradeMessage({ text: error.message || "Failed to sell stock", type: 'error' });
    } finally {
      setTradeLoading(false);
    }
  };

  const currentHolding = holdings.find(h => h.symbol === selectedSymbol);

  const exportToCSV = () => {
    if (!history || history.length === 0) return;

    // Filter out rows with null values and prepare headers
    const headers = ["Date", "Open", "High", "Low", "Close", "Adj Close", "Volume"];
    const rows = history
      .filter(d => d.date && d.close !== null)
      .map(d => [
        new Date(d.date).toISOString().split('T')[0],
        d.open?.toFixed(2) || "",
        d.high?.toFixed(2) || "",
        d.low?.toFixed(2) || "",
        d.close?.toFixed(2) || "",
        d.adjClose?.toFixed(2) || "",
        d.volume || ""
      ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedSymbol}_${range}_history.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("min-h-screen bg-background text-foreground selection:bg-blue-500/30 transition-colors duration-300", theme)}>
      {/* Sandwich Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-background border-r border-border z-50 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-10">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Profile Section */}
                <div className="mb-10 p-4 border border-border rounded-2xl bg-muted/30">
                  {user ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full border-2 border-blue-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-sm truncate">{user.displayName || 'TRADER_ALPHA'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { signIn(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-widest"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </button>
                  )}
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-2">
                  <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2 px-2">Navigation</p>
                  <MobileNavLink 
                    icon={<LayoutDashboard className="w-4 h-4" />} 
                    label="Dashboard" 
                    active={viewMode === "single"} 
                    onClick={() => { setViewMode("single"); setIsMenuOpen(false); }} 
                  />
                  <MobileNavLink 
                    icon={<Filter className="w-4 h-4" />} 
                    label="Stock Screener" 
                    active={viewMode === "screener"} 
                    onClick={() => { setViewMode("screener"); setIsMenuOpen(false); }} 
                  />
                  <MobileNavLink 
                    icon={<ArrowLeftRight className="w-4 h-4" />} 
                    label="Compare" 
                    active={viewMode === "compare"} 
                    onClick={() => { setViewMode("compare"); setIsMenuOpen(false); }} 
                  />
                  <MobileNavLink 
                    icon={<PieChart className="w-4 h-4" />} 
                    label="Portfolio" 
                    active={viewMode === "portfolio"} 
                    onClick={() => { setViewMode("portfolio"); setIsMenuOpen(false); }} 
                  />
                </nav>

                <div className="mt-auto pt-6 border-t border-border flex flex-col gap-2">
                  <button 
                    onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                    className="flex items-center justify-between p-3 px-4 hover:bg-muted rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-blue-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                      <span className="text-xs font-mono font-bold uppercase tracking-widest">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>
                  {user && (
                    <button 
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 p-3 px-4 hover:bg-red-500/10 rounded-xl transition-colors group text-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-widest">Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Only */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 hidden lg:flex flex-col items-center py-8 border-r border-border bg-background z-20 transition-colors duration-300">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-blue-900/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <nav className="flex flex-col gap-8">
          <button onClick={() => setViewMode("single")} title="Dashboard">
            <LayoutDashboard className={cn("w-5 h-5 transition-colors", viewMode === "single" ? "text-blue-500" : "text-muted-foreground hover:text-foreground")} />
          </button>
          <button onClick={() => setViewMode("screener")} title="Stock Screener">
            <Filter className={cn("w-5 h-5 transition-colors", viewMode === "screener" ? "text-blue-500" : "text-muted-foreground hover:text-foreground")} />
          </button>
          <button onClick={() => setViewMode("compare")} title="Compare Stocks">
            <ArrowLeftRight className={cn("w-5 h-5 transition-colors", viewMode === "compare" ? "text-blue-500" : "text-muted-foreground hover:text-foreground")} />
          </button>
          <button onClick={() => setViewMode("compare")} title="Analytics">
            <BarChart3 className={cn("w-5 h-5 transition-colors", viewMode === "compare" ? "text-blue-500" : "text-muted-foreground hover:text-foreground")} />
          </button>
          <button onClick={() => setViewMode("portfolio")} title="Portfolio Performance">
            <PieChart className={cn("w-5 h-5 transition-colors", viewMode === "portfolio" ? "text-blue-500" : "text-muted-foreground hover:text-foreground")} />
          </button>
        </nav>
        <div className="mt-auto flex flex-col gap-6 items-center">
          {user ? (
            <button 
              onClick={logout}
              title={`Sign out (${user.displayName})`}
              className="group relative"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full border border-border" />
              ) : (
                <UserIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
              <div className="absolute left-10 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover border border-border text-[8px] font-mono whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest text-foreground">
                Sign Out
              </div>
            </button>
          ) : (
            <button 
              onClick={signIn}
              title="Sign In with Google"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )}
          <RefreshCw 
            className={cn("w-5 h-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer", loading && "animate-spin")} 
            onClick={() => viewMode === "single" ? fetchData(selectedSymbol) : setCompareSymbols([...compareSymbols])}
          />
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-4"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-16 p-4 lg:p-8 max-w-(--breakpoint-2xl) mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 group">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col relative group/title">
              {/* Bull/Bear Background Decoration */}
              <div className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-r from-emerald-500/5 via-transparent to-rose-500/5 opacity-0 group-hover/title:opacity-100 transition-all duration-1000 blur-2xl pointer-events-none rounded-3xl" />
              
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-5 scale-150 pointer-events-none group-hover/title:opacity-10 group-hover/title:-translate-x-2 transition-all duration-700">
                <BullIcon className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-5 scale-150 pointer-events-none group-hover/title:opacity-10 group-hover/title:translate-x-2 transition-all duration-700">
                <BearIcon className="w-24 h-24 text-rose-500" />
              </div>

              <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-[32px] font-black text-emerald-500/5 select-none pointer-events-none hidden md:block group-hover/title:text-emerald-500/10 transition-colors duration-500 tracking-tighter">BULL</div>
              <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[32px] font-black text-rose-500/5 select-none pointer-events-none hidden md:block group-hover/title:text-rose-500/10 transition-colors duration-500 tracking-tighter">BEAR</div>
              
              <div className="flex items-center gap-3 relative z-10">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase font-mono">
                  StockPulse <span className="text-blue-500 font-normal">Terminal</span>
                </h1>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-widest flex items-center gap-1.5",
                  isMarketOpen ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20" : "bg-muted text-muted-foreground"
                )}>
                  <div className={cn("w-1 h-1 rounded-full", isMarketOpen ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
                  {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
                </div>
              </div>
              <p className="text-muted-foreground text-[10px] font-mono flex items-center gap-2 mt-1 uppercase tracking-widest relative z-10">
                <Clock className="w-3 h-3" />
                MODE: {viewMode} | SYNC: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SearchBar onSelect={(s) => { setSelectedSymbol(s); setViewMode("single"); }} />
            
            {/* Desktop Profile Dropdown / Quick Access */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-px h-6 bg-border mx-2" />
              {user ? (
                <div className="flex items-center gap-3 bg-muted/20 border border-border p-1 pr-4 rounded-full">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-border shadow-sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold uppercase truncate max-w-[100px]">{user.displayName || 'TRADER'}</span>
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Pro Account</span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={signIn}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="hidden sm:flex lg:hidden w-10 h-10 rounded-xl items-center justify-center bg-muted border border-border transition-colors text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {serverError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-red-500" />
              <p className="text-xs font-mono text-red-500 uppercase tracking-widest font-bold">
                {serverError}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white text-[10px] font-mono font-bold rounded-xl uppercase tracking-widest"
            >
              Retry Connection
            </button>
          </div>
        )}

        {viewMode === "portfolio" ? (
          <PortfolioPerformance onBack={() => setViewMode("single")} />
        ) : viewMode === "screener" ? (
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => setViewMode("single")}
              className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest self-start"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Dashboard
            </button>
            <StockScreener onSelect={(s) => { setSelectedSymbol(s); setViewMode("single"); }} />
          </div>
        ) : viewMode === "compare" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 mb-2">
              <button 
                onClick={() => setViewMode("single")}
                className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest self-start"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Dashboard
              </button>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-mono tracking-tight uppercase flex items-center gap-2 text-blue-500">
                  <ArrowLeftRight className="w-5 h-5" />
                  Comparison Dashboard
                </h2>
                <div className="flex bg-muted/50 p-1 rounded-xl border border-border shrink-0 gap-1">
                {["1d", "5d", "1mo", "6mo", "1y"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
                      range === r ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
                <div className="w-px h-4 bg-border self-center mx-1" />
                <button
                  onClick={() => setCompareSymbols([...compareSymbols])}
                  className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", compareLoading && "animate-spin")} />
                </button>
              </div>
            </div>
          </div>
          <CompareView 
              symbols={compareSymbols} 
              quotes={compareQuotes} 
              histories={compareHistories} 
              onRemove={removeFromCompare}
              loading={compareLoading}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Chart Area */}
            <section className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-muted/10 border border-border rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <CompanyLogo symbol={quote?.symbol || ""} size="lg" className="rounded-xl shadow-sm" />
                      <div className="flex flex-col">
                        <h2 className="text-3xl font-bold font-mono tracking-tighter">{quote?.symbol}</h2>
                        <span className="text-muted-foreground text-sm font-mono truncate max-w-[200px]">
                          {quote?.shortName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-mono font-bold tracking-tighter">
                        {formatCurrency(quote?.regularMarketPrice, quote?.currency)}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold font-mono",
                        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {quote?.regularMarketChangePercent?.toFixed(2)}%
                      </div>

                      {quote?.regularMarketChangePercent && (
                        <div className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-bold font-mono tracking-widest uppercase",
                          Math.abs(quote.regularMarketChangePercent) < 1.5 ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                        )}>
                          {Math.abs(quote.regularMarketChangePercent) < 1.5 ? "SAFE TYPE" : "DANGER TYPE"}
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          const el = document.getElementById('ai-analysis-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-muted border border-border hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all ml-auto"
                      >
                        <BrainCircuit className="w-3 h-3 text-blue-500" />
                        AI Analysis
                      </button>
                      
                      {currentHolding && (
                        <div className="bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-xl flex items-center gap-2">
                          <Wallet className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-mono font-bold text-blue-500">
                            HOLDING: {currentHolding.quantity} SHARES
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Trading & Comparison Buttons */}
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 shrink-0">
                          <button 
                            onClick={() => setTradeQuantity(Math.max(1, tradeQuantity - 1))}
                            className="p-1 px-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input 
                            type="number" 
                            value={tradeQuantity}
                            onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 bg-transparent border-none text-center font-mono text-sm font-bold focus:ring-0"
                          />
                          <button 
                            onClick={() => setTradeQuantity(tradeQuantity + 1)}
                            className="p-1 px-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleBuy}
                            disabled={tradeLoading}
                            className={cn(
                              "flex-1 min-w-[120px] max-w-[140px] bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2",
                              tradeLoading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            BUY
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSell}
                            disabled={tradeLoading || !currentHolding || currentHolding.quantity < tradeQuantity}
                            className={cn(
                              "flex-1 min-w-[120px] max-w-[140px] bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2",
                              (tradeLoading || !currentHolding || currentHolding.quantity < tradeQuantity) && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Minus className="w-3 h-3" />
                            SELL
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => quote && addToCompare(quote.symbol)}
                            className="flex-1 min-w-[150px] max-w-[180px] bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            COMPARE
                          </motion.button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {tradeMessage && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className={cn(
                              "text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-lg inline-block",
                              tradeMessage.type === 'success' ? "text-green-500 bg-green-500/5 whitespace-normal" : "text-red-500 bg-red-500/5 whitespace-normal"
                            )}
                          >
                            {tradeMessage.text}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border shrink-0 gap-1">
                      <button 
                        onClick={() => {
                          const el = document.getElementById('ai-analysis-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted text-muted-foreground hover:text-blue-400 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all"
                        title="AI Analysis"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        AI Analysis
                      </button>
                      <div className="w-px h-4 bg-border self-center mx-1" />
                      {["1d", "5d", "1mo", "6mo", "1y"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
                          range === r ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-border self-center mx-1" />
                    <button
                      onClick={exportToCSV}
                      className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Export CSV"
                      disabled={history.length === 0}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => fetchData(selectedSymbol)}
                      className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Refresh Data"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                  </div>
                </div>

                <div className="h-[500px] w-full">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <LoaderPulse />
                    </div>
                  ) : (
                    <StockChart data={history} isPositive={isPositive} currency={quote?.currency} />
                  )}
                </div>
              </div>

              <SentimentModule symbol={selectedSymbol} />

              {/* Key Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="MARKET CAP" value={formatCompactNumber(quote?.marketCap)} />
                <StatCard label="VOLUME" value={formatCompactNumber(quote?.regularMarketVolume)} />
                <StatCard label="DAY HIGH" value={formatCurrency(quote?.regularMarketDayHigh, quote?.currency)} />
                <StatCard label="DAY LOW" value={formatCurrency(quote?.regularMarketDayLow, quote?.currency)} />
              </div>

              {/* Company Profile Section */}
              <AnimatePresence mode="wait">
                {profile && (
                  <motion.div 
                    key={selectedSymbol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-muted/10 border border-border rounded-3xl p-8 flex flex-col gap-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                      <h3 className="text-xl font-bold font-mono tracking-tight uppercase text-blue-500 flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Company Profile
                      </h3>
                      <div className="flex flex-wrap gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground opacity-60 uppercase">SECTOR:</span>
                          <span className="text-foreground">{profile.sector || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground opacity-60 uppercase">INDUSTRY:</span>
                          <span className="text-foreground">{profile.industry || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground opacity-60 uppercase">EMPLOYEES:</span>
                          <span className="text-foreground font-mono tracking-tighter">
                            {profile.fullTimeEmployees ? profile.fullTimeEmployees.toLocaleString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-8 flex flex-col gap-4">
                        <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">About {quote?.shortName || selectedSymbol}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed font-sans line-clamp-6 group-hover:line-clamp-none transition-all">
                          {profile.longBusinessSummary}
                        </p>
                      </div>
                      
                      <div className="md:col-span-4 flex flex-col gap-6">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3">Key Leadership</h4>
                          <div className="space-y-3">
                            {profile.companyOfficers?.slice(0, 3).map((officer, idx) => (
                              <div key={idx} className="flex flex-col">
                                <span className="text-xs font-bold text-foreground">{officer.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight truncate">{officer.title}</span>
                              </div>
                            ))}
                            {!profile.companyOfficers?.length && <span className="text-xs text-muted-foreground font-mono italic uppercase">Data not available</span>}
                          </div>
                        </div>

                        {profile.website && (
                          <a 
                            href={profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-500 text-xs font-mono font-bold uppercase tracking-widest hover:text-blue-400 transition-colors"
                          >
                            Visit Website <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Right Sidebar: Watchlist & Portfolio */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              {user && (
                <div className="bg-muted/10 border border-border rounded-2xl p-6">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-foreground">
                    <PieChart className="w-4 h-4" />
                    MY PORTFOLIO
                  </h3>
                  <div className="space-y-3">
                    {portfolioLoading ? (
                      <div className="py-4 flex justify-center"><LoaderPulse /></div>
                    ) : holdings.length > 0 ? (
                      holdings.map((h) => (
                        <button
                          key={h.symbol}
                          onClick={() => setSelectedSymbol(h.symbol)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                            selectedSymbol === h.symbol 
                              ? "bg-blue-600/10 border-blue-500/50" 
                              : "bg-muted/30 border-border hover:border-muted-foreground/30"
                          )}
                        >
                          <div>
                            <p className="font-mono font-bold text-sm text-foreground">{h.symbol}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-mono">
                              {h.quantity} SHARES @ {formatCurrency(h.averagePrice)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-blue-500">
                              {formatCurrency(h.quantity * h.averagePrice)}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-8 text-center border border-dashed border-border rounded-xl">
                        <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                          NO HOLDINGS
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <RiskAnalysis quote={quote} history={history} />
              
              <AlertsSection symbol={selectedSymbol} currentPrice={quote?.regularMarketPrice || 0} />

              <NewsSection symbol={selectedSymbol} />
              
              <div className="bg-muted/10 border border-border rounded-2xl p-6">
                <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-4 flex items-center justify-between text-foreground">
                  WATCHLIST
                  <span className="text-[10px] font-normal text-muted-foreground">AUTO-UPDATE</span>
                </h3>
                <div className="space-y-3">
                  {watchlistQuotes.map((q) => (
                    <div key={q.symbol} className="flex gap-2">
                      <button
                        onClick={() => setSelectedSymbol(q.symbol)}
                        className={cn(
                          "flex-1 flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                          selectedSymbol === q.symbol 
                            ? "bg-blue-600/10 border-blue-500/50" 
                            : "bg-muted/30 border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <CompanyLogo symbol={q.symbol} size="md" className="rounded-lg" />
                          <div>
                            <p className="font-mono font-bold text-sm text-foreground">{q.symbol}</p>
                            <p className="text-[10px] text-muted-foreground truncate w-32 uppercase font-mono">{q.shortName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-foreground">{q.regularMarketPrice?.toFixed(2)}</p>
                          <p className={cn(
                            "text-[10px] font-mono",
                            (q.regularMarketChangePercent || 0) >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {(q.regularMarketChangePercent || 0) >= 0 ? "+" : ""}{q.regularMarketChangePercent?.toFixed(2)}%
                          </p>
                        </div>
                      </button>
                      <button 
                        onClick={() => addToCompare(q.symbol)}
                        className="p-3 bg-muted/30 border border-border rounded-xl hover:border-blue-500/50 transition-all text-muted-foreground hover:text-blue-500"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

      </main>

      {/* Decorative background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 -z-10 bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:40px_40px]"></div>
      
      <MarketTicker />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/10 border border-border rounded-2xl p-4 flex flex-col gap-1 hover:border-muted-foreground/30 transition-colors text-left">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</span>
      <span className="text-xl font-mono font-bold tracking-tighter text-foreground">{value}</span>
    </div>
  );
}

function MobileNavLink({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick: () => void; 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3 px-4 rounded-xl transition-all group",
        active 
          ? "bg-blue-600/10 text-blue-500 text-left" 
          : "hover:bg-muted text-muted-foreground hover:text-foreground text-left"
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-xs font-mono font-bold uppercase tracking-widest">{label}</span>
      </div>
      {active && <div className="w-1 h-1 rounded-full bg-blue-500" />}
    </button>
  );
}

function LoaderPulse() {
  return (
    <div className="flex gap-1.5 items-end">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{ height: [10, 40, 10] }}
          transition={{
            repeat: Infinity,
            duration: 1,
            delay: i * 0.1,
          }}
          className="w-1.5 bg-blue-500/50 rounded-full"
        />
      ))}
    </div>
  );
}
