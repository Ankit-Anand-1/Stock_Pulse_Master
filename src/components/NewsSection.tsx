import React, { useState, useEffect } from "react";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  thumbnail?: { resolutions: { url: string }[] };
}

interface NewsSectionProps {
  symbol: string;
}

export default function NewsSection({ symbol }: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchNews(isSilent = false) {
      if (!symbol) return;
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/stock/${symbol}/news`);
        const data = await res.json();
        setNews(data);
      } catch (error) {
        console.error("News failed:", error);
      } finally {
        if (!isSilent) setLoading(false);
      }
    }

    fetchNews();
    const interval = setInterval(() => fetchNews(true), 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="bg-muted/10 border border-border rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-500" />
          <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-foreground">
            MARKET HEADLINES <span className="text-muted-foreground font-normal">/ {symbol}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-[8px] font-mono font-bold text-blue-500">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="space-y-4 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            news.map((item) => (
              <motion.a
                key={item.uuid}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="block p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50 group"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h4 className="text-xs font-medium leading-relaxed group-hover:text-blue-400 transition-colors text-foreground">
                    {item.title}
                  </h4>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                  <span className="uppercase text-blue-500/70">{item.publisher}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {(() => {
                      const date = item.providerPublishTime ? new Date(item.providerPublishTime * 1000) : null;
                      if (!date || isNaN(date.getTime())) return "Recently";
                      return `${formatDistanceToNow(date)} ago`;
                    })()}
                  </span>
                </div>
              </motion.a>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
              No recent news for {symbol}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
