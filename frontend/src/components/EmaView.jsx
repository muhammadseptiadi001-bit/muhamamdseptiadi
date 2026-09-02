import { useEffect, useState } from "react";
import EmaChart from "./EmaChart";
import EmaSetupPanel from "./EmaSetupPanel";
import { fetchEma } from "../api";

const TIMEFRAMES = [
  { key: "m5", label: "M5" },
  { key: "m15", label: "M15" },
  { key: "m30", label: "M30" },
  { key: "h1", label: "H1" },
  { key: "h4", label: "H4" },
  { key: "d1", label: "D1" },
];

export default function EmaView({ symbol }) {
  const [timeframe, setTimeframe] = useState("m15");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);

    fetchEma(symbol, timeframe)
      .then(setData)
      .catch(() =>
        setError(
          "Gagal memuat data EMA untuk timeframe ini. Butuh minimal ~130 candle historis (EMA125), data intraday sering terbatas untuk simbol tertentu."
        )
      )
      .finally(() => setLoading(false));
  }, [symbol, timeframe]);

  if (!symbol) return null;

  return (
    <div className="brg-view">
      <div className="tf-tabs">
        {TIMEFRAMES.map((tf) => (
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
      {loading && <div className="loading-box">Memuat data EMA...</div>}
      {!loading && data && <EmaChart rows={data.rows} />}
      {!loading && data && <EmaSetupPanel data={data} />}
    </div>
  );
}
