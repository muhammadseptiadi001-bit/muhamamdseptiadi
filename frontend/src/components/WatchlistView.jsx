import { useEffect, useRef, useState } from "react";
import { fetchBrgSummary, fetchEma, logJournalSignal } from "../api";

const BIAS_LABEL = { BUY: "Beli", SELL: "Jual", NEUTRAL: "Netral" };
const BIAS_CLASS = { BUY: "bias-buy", SELL: "bias-sell", NEUTRAL: "bias-neutral" };

const STATUS_LABEL = {
  TP_HIT: "Target tercapai — JUAL sekarang",
  SL_HIT: "Kena Stop Loss — sebaiknya keluar",
  IN_POSITION: "Posisi berjalan, terus pantau",
  WAITING: "Belum masuk area entry",
};

const STATUS_CLASS = {
  TP_HIT: "status-tp",
  SL_HIT: "status-sl",
  IN_POSITION: "status-active",
  WAITING: "status-waiting",
};

const NEEDS_ACTION = new Set(["TP_HIT", "SL_HIT"]);

const AUTO_REFRESH_MS = 60000;

export default function WatchlistView({ watchlist, onToggleWatch, onSelectSymbol }) {
  const [dataBySymbol, setDataBySymbol] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const logIfSetupActive = (symbol) => {
    // Best-effort: a watched symbol can develop a fresh setup any time
    // after it was starred, not just at the moment of starring - so the
    // journal also needs to catch new setups on every poll here, not just
    // in App.jsx's one-time log on star-click.
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
    watchlist.forEach((item) => logIfSetupActive(item.symbol));
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
          const status = entry?.data?.trade_plan?.status;
          const cardClass = status && NEEDS_ACTION.has(status) ? "watchlist-card needs-action" : "watchlist-card";
          return (
            <div key={item.symbol} className={cardClass}>
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
                    <>
                      {status && (
                        <div className={`status-banner-sm ${STATUS_CLASS[status]}`}>
                          {STATUS_LABEL[status]}
                        </div>
                      )}
                      <div className="watchlist-plan">
                        <span>Harga: {entry.data.trade_plan.current_price}</span>
                        <span>Entry: {entry.data.trade_plan.entry}</span>
                        <span className="wp-sl">SL: {entry.data.trade_plan.stop_loss}</span>
                        <span className="wp-tp">TP: {entry.data.trade_plan.take_profit}</span>
                      </div>
                    </>
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
