import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE_URL });

export async function fetchSymbols() {
  const { data } = await client.get("/api/symbols");
  return data;
}

export async function fetchQuote(symbol) {
  const { data } = await client.get(`/api/quote/${encodeURIComponent(symbol)}`);
  return data;
}

export async function fetchPrediction(symbol) {
  const { data } = await client.get(`/api/predict/${encodeURIComponent(symbol)}`);
  return data;
}
