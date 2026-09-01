import { useEffect, useState } from "react";
import { fetchBrgScan } from "../api";

const BIAS_LABEL = { BUY: "Beli", SELL: "Jual", NEUTRAL: "Netral" };
const BIAS_CLASS = { BUY: "scan-buy", SELL: "scan-sell", NEUTRAL: "scan-neutral" };

export default function ScannerView({ onSelectSymbol, isWatched, onToggleWatch }) {
  const [category, setCategory] = useState("forex");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runScan = (cat) => {
    setLoading(true);
    setError(null);
    fetchBrgScan(cat)
      .then((data) => setRows(data.results))
      .catch(() => setError("Gagal menjalankan scanner. Coba lagi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runScan(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const buyCount = rows.filter((r) => r.bias === "BUY").length;
  const sellCount = rows.filter((r) => r.bias === "SELL").length;
  const otherCount = rows.length - buyCount - sellCount;

  return (
    <div className="scanner-view">
      <div className="scanner-controls">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="forex">Forex</option>
          <option value="stocks">Saham (IDX)</option>
        </select>
        <button onClick={() => runScan(category)} disabled={loading}>
          {loading ? "Memindai..." : "Scan Ulang"}
        </button>
        {rows.length > 0 && (
          <span className="scan-tally">
            {buyCount} Beli &middot; {sellCount} Jual &middot; {otherCount} Netral/Error
          </span>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-box">Memindai semua simbol, mohon tunggu...</div>}

      {!loading && rows.length > 0 && (
        <div className="scanner-table-wrap">
          <table className="scanner-table">
            <thead>
              <tr>
                <th></th>
                <th>Simbol</th>
                <th>Bias H4</th>
                <th>Harga Terakhir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} className={row.bias ? BIAS_CLASS[row.bias] : ""}>
                  <td>
                    <button
                      className={isWatched(row.symbol) ? "star-btn active" : "star-btn"}
                      onClick={() => onToggleWatch(row.symbol, row.name)}
                      title={isWatched(row.symbol) ? "Hapus dari pantauan" : "Tandai untuk dipantau"}
                    >
                      {isWatched(row.symbol) ? "★" : "☆"}
                    </button>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.bias ? BIAS_LABEL[row.bias] : row.error ? "Gagal" : "-"}</td>
                  <td>{row.last_close != null ? row.last_close.toFixed(4) : "-"}</td>
                  <td>
                    <button className="scan-detail-btn" onClick={() => onSelectSymbol(row.symbol)}>
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="disclaimer">
        Bias dihitung otomatis dari breakout channel H4 saja (untuk cek confluence M5/M1, klik
        &quot;Lihat Detail&quot; lalu buka tab Analisa BRG). Ini bukan sinyal trading pasti &mdash;
        gunakan sebagai gambaran awal, bukan keputusan akhir.
      </p>
    </div>
  );
}
