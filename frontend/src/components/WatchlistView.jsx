import { useEffect, useRef, useState } from "react";
import { fetchBrgSummary } from "../api";

const BIAS_LABEL = { BUY: "Beli", SELL: "Jual", NEUTRAL: "Netral" };
const BIAS_CLASS = { BUY: "bias-buy", SELL: "bias-sell", NEUTRAL: "bias-neutral" };

const AUTO_REFRESH_MS = 60000;

export default function WatchlistView({ watchlist, onToggleWatch, onSelectSymbol }) {
  const [dataBySymbol, setDataBySymbol] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const refreshAll = () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    Promise.all(
      watchlist.map((item) =>
        fetchBrgSummary(item.symbol)
          .then((data) => [item.symbol, { data, error: null }])
          .catch(() => [item.symbol, { data: null, error: "Gagal memuat" }])
      )
    ).then((entries) => {
      setDataBySymbol(Object.fromEntries(entries));
      setLastUpdated(new Date());
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refreshAll, AUTO_REFRESH_MS);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, watchlist.length]);

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-view">
        <p className="empty-watchlist">
          Belum ada simbol yang ditandai. Klik ikon bintang (☆) di daftar simbol atau tabel
          Scanner untuk menambahkan simbol ke pantauan Anda di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="watchlist-view">
      <div className="scanner-controls">
        <button onClick={refreshAll} disabled={loading}>
          {loading ? "Memuat..." : "Refresh Semua"}
        </button>
        <label className="auto-refresh-toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh tiap 1 menit
        </label>
        {lastUpdated && (
          <span className="scan-tally">Terakhir update: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

      <div className="watchlist-grid">
        {watchlist.map((item) => {
          const entry = dataBySymbol[item.symbol];
          return (
            <div key={item.symbol} className="watchlist-card">
              <div className="watchlist-card-header">
                <span className="watchlist-name">{item.name}</span>
                <button
                  className="star-btn active"
                  onClick={() => onToggleWatch(item.symbol, item.name)}
                  title="Hapus dari pantauan"
                >
                  ★
                </button>
              </div>

              {!entry && <p className="loading-box">Memuat...</p>}
              {entry?.error && <p className="error-box">{entry.error}</p>}

              {entry?.data && (
                <>
                  <div className={`bias-banner ${BIAS_CLASS[entry.data.h4.bias.bias]}`}>
                    {BIAS_LABEL[entry.data.h4.bias.bias]}
                  </div>

                  {entry.data.trade_plan && (
                    <div className="watchlist-plan">
                      <span>Entry: {entry.data.trade_plan.entry}</span>
                      <span className="wp-sl">SL: {entry.data.trade_plan.stop_loss}</span>
                      <span className="wp-tp">TP: {entry.data.trade_plan.take_profit}</span>
                    </div>
                  )}

                  {!entry.data.trade_plan && (
                    <p className="watchlist-no-plan">Belum ada rencana entry saat ini.</p>
                  )}
                </>
              )}

              <button className="scan-detail-btn" onClick={() => onSelectSymbol(item.symbol)}>
                Lihat Detail
              </button>
            </div>
          );
        })}
      </div>

      <p className="disclaimer">
        Pantauan ini menampilkan bias H4 dan rencana entry (kalau ada) untuk simbol yang Anda
        tandai. Bukan notifikasi real-time dari broker &mdash; data diperbarui saat halaman ini
        dibuka atau saat Anda klik refresh/auto-refresh.
      </p>
    </div>
  );
}
