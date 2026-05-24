
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import yahooFinance from "yahoo-finance2";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure yahoo-finance2
if (typeof (yahooFinance as any).setGlobalConfig === "function") {
  (yahooFinance as any).setGlobalConfig({
    validation: { logErrors: false, logOptionsErrors: false },
  });
}

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

// In-memory cache for sentiment
const sentimentCache: Record<string, { sentiment: string; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

app.use(express.json());

/* ---------------- BULK ROUTES ---------------- */

app.get("/api/stock/bulk/quotes", async (req, res) => {
  const symbols = ((req.query.symbols as string) || "").split(",").filter(Boolean);
  if (!symbols.length) return res.json([]);

  try {
    const quotes = await yahooFinance.quote(symbols, {}, { validateResult: false });
    res.json(Array.isArray(quotes) ? quotes.filter(Boolean) : [quotes]);
  } catch {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          return await yahooFinance.quote(sym, {}, { validateResult: false });
        } catch {
          return null;
        }
      })
    );
    res.json(results.filter(Boolean));
  }
});

app.get("/api/stock/bulk/history", async (req, res) => {
  const symbols = ((req.query.symbols as string) || "").split(",").filter(Boolean);
  if (!symbols.length) return res.json({});

  const { range = "1mo", interval } = req.query;
  const now = new Date();
  let startDate = new Date();
  let intervalToUse = interval as any;

  switch (range) {
    case "1d": startDate.setDate(now.getDate() - 1); intervalToUse ||= "5m"; break;
    case "5d": startDate.setDate(now.getDate() - 5); intervalToUse ||= "15m"; break;
    case "1mo": startDate.setMonth(now.getMonth() - 1); intervalToUse ||= "1d"; break;
    case "6mo": startDate.setMonth(now.getMonth() - 6); intervalToUse ||= "1d"; break;
    case "1y": startDate.setFullYear(now.getFullYear() - 1); intervalToUse ||= "1d"; break;
    default: startDate.setMonth(now.getMonth() - 1); intervalToUse ||= "1d";
  }

  const results: Record<string, any[]> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const data = await yahooFinance.chart(sym, { period1: startDate, period2: now, interval: intervalToUse }, { validateResult: false });
        results[sym] = data.quotes || [];
      } catch {
        results[sym] = [];
      }
    })
  );
  res.json(results);
});

/* ---------------- SINGLE ASSET ROUTES ---------------- */

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const quote = await yahooFinance.quote(req.params.symbol, {}, { validateResult: false });
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stock quote" });
  }
});

app.get("/api/stock/:symbol/history", async (req, res) => {
  const { symbol } = req.params;
  const { range = "1mo", interval } = req.query;
  const now = new Date();
  let startDate = new Date();
  let intervalToUse = interval as any;

  switch (range) {
    case "1d": startDate.setDate(now.getDate() - 1); intervalToUse ||= "5m"; break;
    case "5d": startDate.setDate(now.getDate() - 5); intervalToUse ||= "15m"; break;
    case "1mo": startDate.setMonth(now.getMonth() - 1); intervalToUse ||= "1d"; break;
    case "6mo": startDate.setMonth(now.getMonth() - 6); intervalToUse ||= "1d"; break;
    case "1y": startDate.setFullYear(now.getFullYear() - 1); intervalToUse ||= "1d"; break;
    case "5y": startDate.setFullYear(now.getFullYear() - 5); intervalToUse ||= "1wk"; break;
    default: startDate.setMonth(now.getMonth() - 1); intervalToUse ||= "1d";
  }

  try {
    const result = await yahooFinance.chart(symbol, { period1: startDate, period2: now, interval: intervalToUse }, { validateResult: false });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stock history" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ quotes: [], news: [] });
    const results = await yahooFinance.search(q as string) as any;
    res.json({ quotes: results.quotes || [], news: results.news || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

app.get("/api/stock/:symbol/news", async (req, res) => {
  try {
    const results = await yahooFinance.search(req.params.symbol) as any;
    res.json(results.news || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch news" });
  }
});

app.get("/api/stock/:symbol/profile", async (req, res) => {
  try {
    const summary = await yahooFinance.quoteSummary(req.params.symbol, { modules: ["assetProfile"] }) as any;
    res.json(summary.assetProfile || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

app.get("/api/stock/:symbol/sentiment", async (req, res) => {
  const { symbol } = req.params;
  const cached = sentimentCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ sentiment: cached.sentiment });
  }

  try {
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false }) as any;
    const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, { validateResult: false }) as any;

    const prompt = `
Perform a comprehensive market sentiment and technical analysis for ${symbol} (${quote?.shortName || symbol}).

MARKET DATA:
- Current Price: ${quote?.regularMarketPrice} ${quote?.currency}
- Day Change: ${quote?.regularMarketChange} (${quote?.regularMarketChangePercent}%)
- Volume: ${quote?.regularMarketVolume} (Avg: ${quote?.averageDailyVolume3Month})
- Market Cap: ${quote?.marketCap}

RECENT PRICE ACTION (Last 7 Days):
${JSON.stringify((chart?.quotes || []).map((q: any) => ({ date: q.date, close: q.close })))}

TASK:
1. Analyze short-term technical trend (Bullish/Bearish/Neutral).
2. Identify key support and resistance levels.
3. Synthesize market sentiment based on recent price action.
4. Suggest 2-3 things traders should watch in the next 24-48 hours.

OUTPUT FORMAT:
Provide the result in Markdown. Use an "Executive Summary" followed by "Technical Indicators" and "Market Outlook".
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sentiment = response.text;
    sentimentCache[symbol] = { sentiment, timestamp: Date.now() };
    res.json({ sentiment });
  } catch {
    res.status(500).json({ error: "Failed to generate sentiment analysis" });
  }
});

app.get("/api/admin/check-alerts", (_req, res) => {
  res.json({ message: "Alert check initiated. In production, this would query Firestore alerts." });
});

/* ---------------- SERVER START ---------------- */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
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
