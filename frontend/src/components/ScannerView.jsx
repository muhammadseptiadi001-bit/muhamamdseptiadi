import { useEffect, useState } from "react";
import { fetchBrgScan } from "../api";

const BIAS_LABEL = { BUY: "Beli", SELL: "Jual", NEUTRAL: "Netral" };
const BIAS_CLASS = { BUY: "scan-buy", SELL: "scan-sell", NEUTRAL: "scan-neutral" };
const PAGE_SIZE = 15;

function bothAgree(row) {
  return row.brg_bias && row.ema_verdict && row.brg_bias !== "NEUTRAL" && row.brg_bias === row.ema_verdict;
}

export default function ScannerView({ onSelectSymbol, isWatched, onToggleWatch }) {
  const [category, setCategory] = useState("forex");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runScan = (cat, pageNum) => {
    setLoading(true);
    setError(null);
    fetchBrgScan(cat, pageNum, PAGE_SIZE)
      .then((data) => {
        setRows(data.results);
        setTotalPages(data.total_pages);
        setTotal(data.total);
        setPage(data.page);
      })
      .catch(() => setError("Gagal menjalankan scanner. Coba lagi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runScan(category, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const agreeCount = rows.filter(bothAgree).length;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="scanner-view">
      <div className="scanner-controls">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
          }}
        >
          <option value="forex">Forex</option>
          <option value="stocks">Saham (IDX)</option>
        </select>
        <button onClick={() => runScan(category, page)} disabled={loading}>
          {loading ? "Memindai..." : "Scan Ulang"}
        </button>
        {rows.length > 0 && (
          <span className="scan-tally">
            Total {total} simbol &middot; {agreeCount} simbol di halaman ini di mana BRG &amp; EMA
            sepakat
          </span>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading-box">Memindai simbol di halaman ini, mohon tunggu...</div>}

      {!loading && rows.length > 0 && (
        <div className="scanner-table-wrap">
          <table className="scanner-table">
            <thead>
              <tr>
                <th></th>
                <th>Simbol</th>
                <th>BRG (H4)</th>
                <th>EMA (M15)</th>
                <th>Harga Terakhir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} className={bothAgree(row) ? "scan-agree" : ""}>
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
                  <td className={row.brg_bias ? BIAS_CLASS[row.brg_bias] : ""}>
                    {row.brg_bias ? BIAS_LABEL[row.brg_bias] : row.error ? "Gagal" : "-"}
                  </td>
                  <td className={row.ema_verdict ? BIAS_CLASS[row.ema_verdict] : ""}>
                    {row.ema_verdict ? BIAS_LABEL[row.ema_verdict] : "-"}
                  </td>
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page <= 1 || loading}
            onClick={() => runScan(category, page - 1)}
          >
            &laquo; Sebelumnya
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              className={n === page ? "page-btn active" : "page-btn"}
              disabled={loading}
              onClick={() => runScan(category, n)}
            >
              {n}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={page >= totalPages || loading}
            onClick={() => runScan(category, page + 1)}
          >
            Selanjutnya &raquo;
          </button>
        </div>
      )}

      <p className="disclaimer">
        Kolom <strong>BRG</strong> = bias breakout channel H4. Kolom <strong>EMA</strong> = setup EMA
        8/21/125+RSI14 di M15 (klik &quot;Lihat Detail&quot; untuk analisa lengkap tiap metode). Baris
        yang disorot hijau/merah muda menandakan kedua metode sepakat &mdash; tetap bukan sinyal
        trading pasti, gunakan sebagai gambaran awal saja.
      </p>
    </div>
  );
}
