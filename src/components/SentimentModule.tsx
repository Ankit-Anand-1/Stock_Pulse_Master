import React, { useState, useEffect } from "react";
import { BrainCircuit, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface SentimentModuleProps {
  symbol: string;
}

export default function SentimentModule({ symbol }: SentimentModuleProps) {
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [analyzedSymbol, setAnalyzedSymbol] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const fetchSentiment = async (isManual = false) => {
    if (!symbol) return;
    
    // If we've already analyzed this symbol in this session and it's not a manual refresh, don't re-fetch
    if (!isManual && analyzedSymbol === symbol && sentiment) return;

    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/stock/${symbol}/sentiment`);
      const data = await res.json();
      
      if (res.status === 429) {
        setError(true);
      }
      
      setSentiment(data.sentiment);
      setAnalyzedSymbol(symbol);
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error("Failed to fetch sentiment:", error);
      setSentiment("Analysis currently unavailable.");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol !== analyzedSymbol) {
      setSentiment(null);
      setError(false);
      setLastAnalyzed(null);
    }
  }, [symbol, analyzedSymbol]);

  return (
    <div className="bg-muted/10 border border-border rounded-2xl p-4 flex flex-col relative overflow-hidden" id="ai-analysis-section">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient-x opacity-40" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
            <BrainCircuit className="w-3 h-3 text-blue-500" />
          </div>
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-foreground">
              AI Market Intel
            </h3>
          </div>
        </div>
        
        {sentiment && !loading && (
          <button 
            onClick={() => fetchSentiment(true)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors group"
            title="Refresh Analysis"
          >
            <motion.div whileTap={{ rotate: 180 }}>
              <BrainCircuit className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-400" />
            </motion.div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto min-h-[80px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 py-8"
            >
              <div className="relative">
                <div className="w-12 h-12 border-2 border-blue-500/10 rounded-full" />
                <div className="absolute top-0 left-0 w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-pulse" />
              </div>
              <p className="text-[9px] uppercase font-mono font-bold tracking-[0.2em] text-blue-500 animate-pulse">
                Synthesizing...
              </p>
            </motion.div>
          ) : sentiment ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <div className="text-[11px] leading-relaxed text-muted-foreground font-sans markdown-content">
                  <ReactMarkdown>
                    {sentiment}
                   </ReactMarkdown>
                </div>
              </div>
              
              {lastAnalyzed && (
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <div className="w-1 h-1 rounded-full bg-green-500/50" />
                  <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
                    Updated: {lastAnalyzed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <div className="w-full p-4 bg-muted/20 rounded-xl border border-border/50 text-center flex flex-col gap-4">
                <p className="text-[9px] text-muted-foreground uppercase font-mono tracking-widest leading-relaxed">
                  Deep intelligence report for <span className="text-blue-500 font-bold">{symbol}</span>.
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => fetchSentiment(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-[9px] font-mono font-bold uppercase tracking-[0.15em] shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Run Analysis
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-start gap-2 opacity-40">
        <Info className="w-2.5 h-2.5 text-muted-foreground mt-0.5" />
        <p className="text-[7px] text-muted-foreground uppercase font-mono leading-tight">
          LLM generated educational report. Not financial advice.
        </p>
      </div>
    </div>
  );
}
