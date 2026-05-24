export interface StockQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketCap?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  trailingPE?: number;
  dividendYield?: number;
  beta?: number;
}

export interface ChartDataPoint {
  date: string;
  close: number;
}

export interface SearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
}

export interface StockProfile {
  industry?: string;
  sector?: string;
  website?: string;
  longBusinessSummary?: string;
  fullTimeEmployees?: number;
  companyOfficers?: Array<{
    name: string;
    title: string;
  }>;
}
