import { useEffect, useState } from "react";
import SymbolPicker from "./components/SymbolPicker";
import SymbolSearch from "./components/SymbolSearch";
import PriceChart from "./components/PriceChart";
import PredictionPanel from "./components/PredictionPanel";
import SignalSummary from "./components/SignalSummary";
import BrgView from "./components/BrgView";
import ScannerView from "./components/ScannerView";
import WatchlistView from "./components/WatchlistView";
import { fetchSymbols, fetchQuote, fetchPrediction, fetchAnalysis } from "./api";
import { loadWatchlist, saveWatchlist } from "./watchlist";
import "./App.css";

const DASHBOARD_TIMEFRAMES = [
  { key: "1d", label: "Harian", interval: "1d", quotePeriod: "6mo", predictPeriod: "1y" },
  { key: "1h", label: "1 Jam", interval: "60m", quotePeriod: "60d", predictPeriod: "60d" },
  { key: "30m", label: "30 Menit", interval: "30m", quotePeriod: "30d", predictPeriod: "30d" },
  { key: "5m", label: "5 Menit", interval: "5m", quotePeriod: "30d", predictPeriod: "30d" },
];

export default function App() {
  const [symbols, setSymbols] = useState({ stocks: [], forex: [] });
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("dashboard");
  const [timeframe, setTimeframe] = useState("1d");
  const [quote, setQuote] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());

  useEffect(() => {
    fetchSymbols()
      .then((data) => {
        setSymbols(data);
        if (data.stocks.length > 0) setSelected(data.stocks[0].symbol);
      })
      .catch(() => setError("Gagal memuat daftar simbol. Pastikan backend berjalan."));
  }, []);

  useEffect(() => {
    if (!selected || view !== "dashboard") return;
    const tf = DASHBOARD_TIMEFRAMES.find((t) => t.key === timeframe) || DASHBOARD_TIMEFRAMES[0];
    setLoading(true);
    setError(null);
    setQuote(null);
    setPrediction(null);
    setAnalysis(null);

    Promise.all([
      fetchQuote(selected, tf.quotePeriod, tf.interval),
      fetchPrediction(selected, tf.predictPeriod, tf.interval),
      fetchAnalysis(selected, tf.predictPeriod, tf.interval),
    ])
      .then(([quoteData, predictionData, analysisData]) => {
        setQuote(quoteData);
        setPrediction(predictionData);
        setAnalysis(analysisData);
      })
      .catch(() =>
        setError(
          "Gagal memuat data untuk simbol/timeframe ini. Data intraday (1 Jam/30 Menit/5 Menit) sering terbatas untuk simbol tertentu."
        )
      )
      .finally(() => setLoading(false));
  }, [selected, view, timeframe]);

  const isWatched = (symbol) => watchlist.some((w) => w.symbol === symbol);

  const toggleWatch = (symbol, name) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.symbol === symbol);
      const next = exists
        ? prev.filter((w) => w.symbol !== symbol)
        : [...prev, { symbol, name: name || symbol }];
      saveWatchlist(next);
      return next;
    });
  };

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
            isWatched={isWatched}
            onToggleWatch={toggleWatch}
          />
        </aside>

        <main>
          <div className="view-tabs">
            <button
              className={view === "dashboard" ? "view-tab active" : "view-tab"}
              onClick={() => setView("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={view === "brg" ? "view-tab active" : "view-tab"}
              onClick={() => setView("brg")}
            >
              Analisa BRG (Multi-Timeframe)
            </button>
            <button
              className={view === "scanner" ? "view-tab active" : "view-tab"}
              onClick={() => setView("scanner")}
            >
              Scanner
            </button>
            <button
              className={view === "watchlist" ? "view-tab active" : "view-tab"}
              onClick={() => setView("watchlist")}
            >
              Pantauan Saya {watchlist.length > 0 && `(${watchlist.length})`}
            </button>
          </div>

          {view === "dashboard" && (
            <>
              <div className="tf-tabs">
                {DASHBOARD_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.key}
                    className={tf.key === timeframe ? "tf-tab active" : "tf-tab"}
                    onClick={() => setTimeframe(tf.key)}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              {error && <div className="error-box">{error}</div>}
              {loading && <div className="loading-box">Memuat data...</div>}
              {!loading && quote && <PriceChart rows={quote.rows} />}
              {!loading && analysis && <SignalSummary analysis={analysis} />}
              {!loading && prediction && <PredictionPanel prediction={prediction} />}
            </>
          )}

          {view === "brg" && <BrgView symbol={selected} />}

          {view === "scanner" && (
            <ScannerView
              onSelectSymbol={(symbol) => {
                setSelected(symbol);
                setView("brg");
              }}
              isWatched={isWatched}
              onToggleWatch={toggleWatch}
            />
          )}

          {view === "watchlist" && (
            <WatchlistView
              watchlist={watchlist}
              onToggleWatch={toggleWatch}
              onSelectSymbol={(symbol) => {
                setSelected(symbol);
                setView("brg");
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
