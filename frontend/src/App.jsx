import { useEffect, useState } from "react";
import SymbolPicker from "./components/SymbolPicker";
import SymbolSearch from "./components/SymbolSearch";
import PriceChart from "./components/PriceChart";
import PredictionPanel from "./components/PredictionPanel";
import SignalSummary from "./components/SignalSummary";
import { fetchSymbols, fetchQuote, fetchPrediction, fetchAnalysis } from "./api";
import "./App.css";

export default function App() {
  const [symbols, setSymbols] = useState({ stocks: [], forex: [] });
  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSymbols()
      .then((data) => {
        setSymbols(data);
        if (data.stocks.length > 0) setSelected(data.stocks[0].symbol);
      })
      .catch(() => setError("Gagal memuat daftar simbol. Pastikan backend berjalan."));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    setPrediction(null);
    setAnalysis(null);

    Promise.all([fetchQuote(selected), fetchPrediction(selected), fetchAnalysis(selected)])
      .then(([quoteData, predictionData, analysisData]) => {
        setQuote(quoteData);
        setPrediction(predictionData);
        setAnalysis(analysisData);
      })
      .catch(() => setError("Gagal memuat data untuk simbol ini. Pastikan simbol valid."))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="app-shell">
      <header>
        <h1>Dashboard Analisa Saham &amp; Forex</h1>
        <p className="subtitle">
          Alat bantu edukasi berbasis indikator teknikal &mdash; bukan rekomendasi atau jaminan
          keuntungan trading.
        </p>
      </header>

      <div className="app-body">
        <aside>
          <SymbolSearch onSearch={setSelected} />
          <SymbolPicker
            stocks={symbols.stocks}
            forex={symbols.forex}
            selected={selected}
            onSelect={setSelected}
          />
        </aside>

        <main>
          {error && <div className="error-box">{error}</div>}
          {loading && <div className="loading-box">Memuat data...</div>}
          {!loading && quote && <PriceChart rows={quote.rows} />}
          {!loading && analysis && <SignalSummary analysis={analysis} />}
          {!loading && prediction && <PredictionPanel prediction={prediction} />}
        </main>
      </div>
    </div>
  );
}
