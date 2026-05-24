import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import YahooFinance from "yahoo-finance2";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// @ts-ignore
const yahooFinance = new YahooFinance();

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// simple check to ensure yahoo-finance2 is ready
if (typeof (yahooFinance as any).setGlobalConfig === 'function') {
  (yahooFinance as any).setGlobalConfig({
    validation: {
      logErrors: false,
      logOptionsErrors: false
    }
  });
}

// Simple in-memory cache for sentiment
const sentimentCache: Record<string, { sentiment: string; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours caching for AI insights

app.use(express.json());

// --- CORE BULK ROUTES (Defined before :symbol params to avoid shadowing) ---

// API: Get quotes (Bulk)
app.get("/api/stock/bulk/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string || "";
    const symbols = symbolsParam.split(",").filter(Boolean);
    
    console.log(`[API] Bulk quotes request for: ${symbols.join(", ")}`);
    
    if (!symbols.length) return res.json([]);

    try {
      const quotes = await yahooFinance.quote(symbols, {}, { validateResult: false });
      const results = Array.isArray(quotes) ? quotes : [quotes];
      res.json(results.filter(Boolean));
    } catch (bulkError) {
      console.warn("Bulk quotes failed, falling back to sequential fetching", bulkError);
      // Fallback: fetch sequentially if bulk fails (one bad symbol can kill bulk)
      const results = await Promise.all(symbols.map(async (sym) => {
        try {
          return await yahooFinance.quote(sym, {}, { validateResult: false });
        } catch (e) {
          console.error(`Failed to fetch fallback quote for ${sym}:`, e);
          return null;
        }
      }));
      res.json(results.filter(Boolean));
    }
  } catch (error: any) {
    console.error("Bulk quotes master error:", error);
    res.status(500).json({ error: "Failed to fetch bulk quotes" });
  }
});

// API: Get historical data (Bulk)
app.get("/api/stock/bulk/history", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string || "";
    const symbols = symbolsParam.split(",").filter(Boolean);
    const { range = "1mo", interval } = req.query;
    
    console.log(`[API] Bulk history request for: ${symbols.join(", ")} | Range: ${range}`);

    if (!symbols.length) return res.json({});

    const now = new Date();
    let startDate = new Date();
    let intervalToUse = interval as any;

    switch(range) {
      case '1d': 
        startDate.setDate(now.getDate() - 1); 
        if (!interval) intervalToUse = '5m';
        break;
      case '5d': 
        startDate.setDate(now.getDate() - 5); 
        if (!interval) intervalToUse = '15m';
        break;
      case '1mo': 
        startDate.setMonth(now.getMonth() - 1); 
        if (!interval) intervalToUse = '1d';
        break;
      case '6mo': 
        startDate.setMonth(now.getMonth() - 6); 
        if (!interval) intervalToUse = '1d';
        break;
      case '1y': 
        startDate.setFullYear(now.getFullYear() - 1); 
        if (!interval) intervalToUse = '1d';
        break;
      default: 
        startDate.setMonth(now.getMonth() - 1);
        if (!interval) intervalToUse = '1d';
    }

    const results: Record<string, any[]> = {};
    await Promise.all(symbols.map(async (sym) => {
      try {
        let data;
        try {
          // Attempt with specific interval
          data = await yahooFinance.chart(sym, {
            period1: startDate,
            period2: now,
            interval: intervalToUse,
          }, { validateResult: false });
        } catch (innerError) {
          // Fallback for crypto or specific symbols that might not like high-res intervals
          console.warn(`Initial history fetch failed for ${sym} with ${intervalToUse}, trying 1d fallback`);
          data = await yahooFinance.chart(sym, {
            period1: startDate,
            period2: now,
            interval: '1d',
          }, { validateResult: false });
        }
        results[sym] = data.quotes || [];
      } catch (e) {
        console.error(`Error fetching bulk history for ${sym}:`, e);
        results[sym] = [];
      }
    }));
    
    res.json(results);
  } catch (error: any) {
    console.error("Bulk history error:", error);
    res.json({});
  }
});

// --- SINGLE ASSET ROUTES ---

// API: Get stock quote
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false });
    res.json(quote);
  } catch (error: any) {
    console.error("Error fetching quote:", error);
    res.status(500).json({ error: error.message || "Failed to fetch stock quote" });
  }
});

// API: Get historical data
app.get("/api/stock/:symbol/history", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = "1mo", interval } = req.query;
    
    // ... dates logic ...
    const now = new Date();
    let startDate = new Date();
    let intervalToUse = interval as any;
    
    switch(range) {
      case '1d': 
        startDate.setDate(now.getDate() - 1); 
        if (!interval) intervalToUse = '5m';
        break;
      case '5d': 
        startDate.setDate(now.getDate() - 5); 
        if (!interval) intervalToUse = '15m';
        break;
      case '1mo': 
        startDate.setMonth(now.getMonth() - 1); 
        if (!interval) intervalToUse = '1d';
        break;
      case '6mo': 
        startDate.setMonth(now.getMonth() - 6); 
        if (!interval) intervalToUse = '1d';
        break;
      case '1y': 
        startDate.setFullYear(now.getFullYear() - 1); 
        if (!interval) intervalToUse = '1d';
        break;
      case '5y': 
        startDate.setFullYear(now.getFullYear() - 5); 
        if (!interval) intervalToUse = '1wk';
        break;
      default: 
        startDate.setMonth(now.getMonth() - 1);
        if (!interval) intervalToUse = '1d';
    }

    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: now,
      interval: intervalToUse,
    }, { validateResult: false });
    
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: error.message || "Failed to fetch stock history" });
  }
});

// API: Search stocks (includes news)
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ quotes: [], news: [] });
    const results = await yahooFinance.search(q as string) as any;
    res.json({
      quotes: results.quotes || [],
      news: results.news || []
    });
  } catch (error: any) {
    console.error("Search failed:", error);
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

// API: Get stock news
app.get("/api/stock/:symbol/news", async (req, res) => {
  try {
    const { symbol } = req.params;
    const results = await yahooFinance.search(symbol) as any;
    res.json(results.news || []);
  } catch (error: any) {
    console.error(`News fetch error for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message || "Failed to fetch news" });
  }
});

// API: Get stock profile
app.get("/api/stock/:symbol/profile", async (req, res) => {
  try {
    const { symbol } = req.params;
    const summary = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile"] }) as any;
    res.json(summary.assetProfile || {});
  } catch (error: any) {
    console.error(`Profile fetch error for ${req.params.symbol}:`, error);
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

// API: Market Sentiment Summary with Gemini
app.get("/api/stock/:symbol/sentiment", async (req, res) => {
  try {
    const { symbol } = req.params;

    // Check cache
    const cached = sentimentCache[symbol];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json({ sentiment: cached.sentiment });
    }
    
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false }) as any;
    const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, { validateResult: false }) as any;

    const prompt = `
      Perform a comprehensive market sentiment and technical analysis for ${symbol} (${quote?.shortName || symbol}).
      
      MARKET DATA:
      - Current Price: ${quote?.regularMarketPrice} ${quote?.currency}
      - Day Change: ${quote?.regularMarketChange}% (${quote?.regularMarketChangePercent}%)
      - Volume: ${quote?.regularMarketVolume} (Avg: ${quote?.averageDailyVolume3Month})
      - Market Cap: ${quote?.marketCap}
      
      RECENT PRICE ACTION (Last 7 Days):
      ${JSON.stringify((chart?.quotes || []).map((q: any) => ({ date: q.date, close: q.close })))}

      TASK:
      1. Analyze short-term technical trend (Bullish/Bearish/Neutral).
      2. Identify key support and resistance levels if possible based on the 7-day data.
      3. Synthesize market sentiment based on recent price action and general market context.
      4. Suggest 2-3 specific things traders should watch in the next 24-48 hours.

      OUTPUT FORMAT:
      Provide the result in Markdown. Use an "Executive Summary" followed by "Technical Indicators" and "Market Outlook".
      Be objective and professional.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const sentiment = response.text;
      
      // Update cache
      sentimentCache[symbol] = { sentiment, timestamp: Date.now() };

      res.json({ sentiment });
    } catch (apiError: any) {
      // Check if it's a rate limit error (429)
      const isQuotaError = apiError.status === 429 || apiError.message?.includes("429") || apiError.message?.includes("quota");
      
      if (!isQuotaError) {
        console.error("Gemini API Error:", apiError);
      } else {
        console.warn(`Gemini Quota Exceeded for ${symbol}`);
      }
      
      if (isQuotaError) {
        return res.status(429).json({ 
          error: "Analysis rate limit reached.",
          sentiment: "AI analysis is currently unavailable due to daily usage limits (20 requests/day). Please try again tomorrow. In the meantime, you can monitor the technical indicators and market headlines." 
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error("Sentiment generation error:", error);
    res.status(500).json({ error: "Failed to generate sentiment analysis" });
  }
});

// API: Check alerts (this would normally be a cron job)
app.get("/api/admin/check-alerts", async (req, res) => {
  try {
    // In a real production app with firebase-admin, the server would 
    // fetch all active alerts from Firestore directly.
    // Since we are using client SDK constraints in this environment, 
    // we simulate the implementation logic.
    res.json({ message: "Alert check initiated. In production, this would be a background job querying Firestore alerts." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
