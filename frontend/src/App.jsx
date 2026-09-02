import { useEffect, useRef, useState } from "react";
import SymbolPicker from "./components/SymbolPicker";
import SymbolSearch from "./components/SymbolSearch";
import PriceChart from "./components/PriceChart";
import PredictionPanel from "./components/PredictionPanel";
import SignalSummary from "./components/SignalSummary";
import BrgView from "./components/BrgView";
import EmaView from "./components/EmaView";
import ScannerView from "./components/ScannerView";
import WatchlistView from "./components/WatchlistView";
import JournalView from "./components/JournalView";
import {
  fetchSymbols,
  fetchQuote,
  fetchPrediction,
  fetchAnalysis,
  fetchBrgSummary,
  fetchEma,
  logJournalSignal,
} from "./api";
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
  const dashboardFetchKey = useRef(null);

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

    const fetchKey = `${selected}|${timeframe}`;
    if (dashboardFetchKey.current === fetchKey) return; // already loaded, revisit only
    dashboardFetchKey.current = fetchKey;

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
      .catch(() => {
        dashboardFetchKey.current = null; // allow retry on next visit
        setError(
          "Gagal memuat data untuk simbol/timeframe ini. Data intraday (1 Jam/30 Menit/5 Menit) sering terbatas untuk simbol tertentu."
        );
      })
      .finally(() => setLoading(false));
  }, [selected, view, timeframe]);

  const isWatched = (symbol) => watchlist.some((w) => w.symbol === symbol);

  const logSignalsForSymbol = (symbol) => {
    // Best-effort: record whatever BRG/EMA setup is active right now, so
    // this moment becomes a graded entry in the journal later. Starring
    // should never fail just because logging failed.
    fetchBrgSummary(symbol)
      .then((data) => {
        const plan = data?.trade_plan;
        if (!plan) return;
        return logJournalSignal({
          symbol,
          method: "BRG",
          timeframe: "h4",
          direction: plan.direction,
          entry: plan.entry,
          stop_loss: plan.stop_loss,
          take_profit: plan.take_profit,
        });
      })
      .catch(() => {});

    fetchEma(symbol, "m15")
      .then((data) => {
        const plan = data?.trade_plan;
        if (!plan) return;
        return logJournalSignal({
          symbol,
          method: "EMA",
          timeframe: "m15",
          direction: plan.direction,
          entry: plan.entry,
          stop_loss: plan.stop_loss,
          take_profit: plan.take_profit,
        });
      })
      .catch(() => {});
  };

  const toggleWatch = (symbol, name) => {
    // Deliberately not the setState-updater-function form: that gets
    // invoked twice by React StrictMode in dev to catch impure logic, and
    // logSignalsForSymbol below is a real side effect (network calls) that
    // must only fire once per click.
    const exists = watchlist.some((w) => w.symbol === symbol);
    const next = exists
      ? watchlist.filter((w) => w.symbol !== symbol)
      : [...watchlist, { symbol, name: name || symbol }];
    saveWatchlist(next);
    setWatchlist(next);
    if (!exists) logSignalsForSymbol(symbol);
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
              className={view === "ema" ? "view-tab active" : "view-tab"}
              onClick={() => setView("ema")}
            >
              Analisa EMA
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
            <button
              className={view === "journal" ? "view-tab active" : "view-tab"}
              onClick={() => setView("journal")}
            >
              Jurnal &amp; Akurasi
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

          {view === "ema" && <EmaView symbol={selected} />}

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

          {view === "journal" && <JournalView />}
        </main>
      </div>
    </div>
  );
}
