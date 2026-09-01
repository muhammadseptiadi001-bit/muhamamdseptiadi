import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE_URL });

export async function fetchSymbols() {
  const { data } = await client.get("/api/symbols");
  return data;
}

export async function fetchQuote(symbol, period = "6mo", interval = "1d") {
  const { data } = await client.get(`/api/quote/${encodeURIComponent(symbol)}`, {
    params: { period, interval },
  });
  return data;
}

export async function fetchPrediction(symbol, period = "1y", interval = "1d") {
  const { data } = await client.get(`/api/predict/${encodeURIComponent(symbol)}`, {
    params: { period, interval },
  });
  return data;
}

export async function fetchAnalysis(symbol, period = "1y", interval = "1d") {
  const { data } = await client.get(`/api/analysis/${encodeURIComponent(symbol)}`, {
    params: { period, interval },
  });
  return data;
}

export async function fetchBrgTimeframe(symbol, timeframe) {
  const { data } = await client.get(
    `/api/brg/${encodeURIComponent(symbol)}/${encodeURIComponent(timeframe)}`
  );
  return data;
}

export async function fetchBrgSummary(symbol) {
  const { data } = await client.get(`/api/brg-summary/${encodeURIComponent(symbol)}`);
  return data;
}

export async function fetchBrgScan(category, page = 1, pageSize = 15) {
  const { data } = await client.get(`/api/brg-scan/${encodeURIComponent(category)}`, {
    params: { page, page_size: pageSize },
  });
  return data;
}
