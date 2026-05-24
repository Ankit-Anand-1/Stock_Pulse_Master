```ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import yahooFinance from "yahoo-finance2";  
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;


if (typeof (yahooFinance as any).setGlobalConfig === "function") {
  (yahooFinance as any).setGlobalConfig({
    validation: {
      logErrors: false,
      logOptionsErrors: false,
    },
  });
}

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Simple in-memory cache for sentiment
const sentimentCache: Record<string, { sentiment: string; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours caching

app.use(express.json());

// --- CORE BULK ROUTES ---
app.get("/api/stock/bulk/quotes", async (req, res) => {
  try {
    const symbolsParam = (req.query.symbols as string) || "";
    const symbols = symbolsParam.split(",").filter(Boolean);
    if (!symbols.length) return res.json([]);

    try {
      const quotes = await yahooFinance.quote(symbols, {}, { validateResult: false });
      const results = Array.isArray(quotes) ? quotes : [quotes];
      res.json(results.filter(Boolean));
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
  } catch {
    res.status(500).json({ error: "Failed to fetch bulk quotes" });
  }
});

app.get("/api/stock/bulk/history", async (req, res) => {
  try {
    const symbolsParam = (req.query.symbols as string) || "";
    const symbols = symbolsParam.split(",").filter(Boolean);
    const { range = "1mo", interval } = req.query;
    if (!symbols.length) return res.json({});

    const now = new Date();
    let startDate = new Date();
    let intervalToUse = interval as any;

    switch (range) {
      case "1d": startDate.setDate(now.getDate() - 1); if (!interval) intervalToUse = "5m"; break;
      case "5d": startDate.setDate(now.getDate() - 5); if (!interval) intervalToUse = "15m"; break;
      case "1mo": startDate.setMonth(now.getMonth() - 1); if (!interval) intervalToUse = "1d"; break;
      case "6mo": startDate.setMonth(now.getMonth() - 6); if (!interval) intervalToUse = "1d"; break;
      case "1y": startDate.setFullYear(now.getFullYear() - 1); if (!interval) intervalToUse = "1d"; break;
      default: startDate.setMonth(now.getMonth() - 1); if (!interval) intervalToUse = "1d";
    }

    const results: Record<string, any[]> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          let data = await yahooFinance.chart(sym, { period1: startDate, period2: now, interval: intervalToUse }, { validateResult: false });
          results[sym] = data.quotes || [];
        } catch {
          results[sym] = [];
        }
      })
    );
    res.json(results);
  } catch {
    res.json({});
  }
});

// --- SINGLE ASSET ROUTES ---
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false });
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stock quote" });
  }
});

app.get("/api/stock/:symbol/history", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = "1mo", interval } = req.query;
    const now = new Date();
    let startDate = new Date();
    let intervalToUse = interval as any;

    switch (range) {
      case "1d": startDate.setDate(now.getDate() - 1); if (!interval) intervalToUse = "5m"; break;
      case "5d": startDate.setDate(now.getDate() - 5); if (!interval) intervalToUse = "15m"; break;
      case "1mo": startDate.setMonth(now.getMonth() - 1); if (!interval) intervalToUse = "1d"; break;
      case "6mo": startDate.setMonth(now.getMonth() - 6); if (!interval) intervalToUse = "1d"; break;
      case "1y": startDate.setFullYear(now.getFullYear() - 1); if (!interval) intervalToUse = "1d"; break;
      case "5y": startDate.setFullYear(now.getFullYear() - 5); if (!interval) intervalToUse = "1wk"; break;
      default: startDate.setMonth(now.getMonth() - 1); if (!interval) intervalToUse = "1d";
    }

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
    const { symbol } = req.params;
    const results = await yahooFinance.search(symbol) as any;
    res.json(results.news || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch news" });
  }
});

app.get("/api/stock/:symbol/profile", async (req, res) => {
  try {
    const { symbol } = req.params;
    const summary = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile"] }) as any;
    res.json(summary.assetProfile || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

app.get("/api/stock/:symbol/sentiment", async (req, res) => {
  try {
    const { symbol } = req.params;
    const cached = sentimentCache[symbol];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ sentiment: cached.sentiment });
    }

    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false }) as any;
    const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, { validateResult: false }) as any;

    const prompt = `Perform a comprehensive market sentiment and technical analysis for ${symbol} (${quote?.shortName || symbol}).`;

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

app.get("/api/admin/check-alerts", async (req, res) => {
  res.json({ message: "Alert check initiated. In production, this would query Firestore alerts." });
});

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
```
