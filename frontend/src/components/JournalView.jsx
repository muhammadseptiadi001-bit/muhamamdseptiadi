import { useEffect, useState } from "react";
import { fetchJournalList, fetchJournalStats } from "../api";

const METHOD_LABEL = { BRG: "BRG (Channel H4)", EMA: "EMA (8/21/125+RSI M15)" };
const DIRECTION_LABEL = { BUY: "Beli", SELL: "Jual" };

const STATUS_LABEL = {
  WAITING: "Menunggu",
  IN_POSITION: "Posisi Berjalan",
  TP_HIT: "Kena TP (Benar)",
  SL_HIT: "Kena SL (Salah)",
};

const STATUS_CLASS = {
  WAITING: "status-waiting",
  IN_POSITION: "status-active",
  TP_HIT: "status-tp",
  SL_HIT: "status-sl",
};

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JournalView() {
  const [stats, setStats] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchJournalStats(), fetchJournalList({ limit: 100 })])
      .then(([statsData, listData]) => {
        setStats(statsData);
        setSignals(listData.signals);
      })
      .catch(() => setError("Gagal memuat jurnal. Coba lagi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="journal-view">
      <div className="scanner-controls">
        <button onClick={refresh} disabled={loading}>
          {loading ? "Memuat..." : "Refresh Jurnal"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {stats && (
        <>
          <h3>Akurasi per Metode (dari sinyal yang sudah selesai)</h3>
          <div className="brg-zone-grid">
            {Object.entries(stats.overall).map(([method, s]) => (
              <div key={method} className="brg-zone-card">
                <span className="zone-tf-label">{METHOD_LABEL[method] || method}</span>
                {s.total === 0 ? (
                  <span>Belum ada sinyal yang selesai dievaluasi</span>
                ) : (
                  <span>
                    {s.wins} benar / {s.losses} salah dari {s.total} sinyal &mdash;{" "}
                    <strong>{s.win_rate}% akurat</strong>
                  </span>
                )}
              </div>
            ))}
          </div>

          {stats.by_symbol.length > 0 && (
            <>
              <h3>Akurasi per Simbol</h3>
              <div className="brg-zone-grid">
                {stats.by_symbol.map((s) => (
                  <div key={`${s.symbol}-${s.method}`} className="brg-zone-card">
                    <span className="zone-tf-label">
                      {s.symbol} &middot; {s.method}
                    </span>
                    <span>
                      {s.wins} benar / {s.losses} salah &mdash; <strong>{s.win_rate}%</strong>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <h3>Riwayat Sinyal</h3>
      {signals.length === 0 && !loading && (
        <p className="watchlist-no-plan">
          Belum ada sinyal tercatat. Sinyal otomatis dicatat saat simbol yang Anda tandai (bintang)
          punya rencana Beli/Jual aktif dari metode BRG atau EMA - baik persis saat ditandai,
          maupun belakangan saat Anda membuka/refresh tab Pantauan Saya. Kalau simbol yang
          ditandai sedang Netral terus, belum ada yang bisa dicatat sampai muncul setup aktif.
        </p>
      )}

      {signals.length > 0 && (
        <div className="scanner-table-wrap">
          <table className="scanner-table">
            <thead>
              <tr>
                <th>Tanggal Dicatat</th>
                <th>Simbol</th>
                <th>Metode</th>
                <th>Arah</th>
                <th>Entry</th>
                <th>SL</th>
                <th>TP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.created_at)}</td>
                  <td>{s.symbol}</td>
                  <td>{METHOD_LABEL[s.method] || s.method}</td>
                  <td>{DIRECTION_LABEL[s.direction] || s.direction}</td>
                  <td>{s.entry}</td>
                  <td className="wp-sl">{s.stop_loss}</td>
                  <td className="wp-tp">{s.take_profit}</td>
                  <td>
                    <span className={`status-banner-sm ${STATUS_CLASS[s.status]}`}>
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="disclaimer">
        {stats?.disclaimer ||
          "Ini catatan rekam jejak sinyal, bukan jaminan sinyal berikutnya akan sama hasilnya."}
      </p>
    </div>
  );
}
