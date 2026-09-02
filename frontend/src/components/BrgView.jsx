import { useEffect, useState } from "react";
import BrgChart from "./BrgChart";
import BrgSummaryPanel from "./BrgSummaryPanel";
import { fetchBrgTimeframe, fetchBrgSummary } from "../api";

const TIMEFRAMES = [
  { key: "h4", label: "H4" },
  { key: "m30", label: "M30" },
  { key: "m5", label: "M5" },
  { key: "m1", label: "M1" },
];

export default function BrgView({ symbol }) {
  const [timeframe, setTimeframe] = useState("h4");
  const [tfData, setTfData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setTfData(null);

    fetchBrgTimeframe(symbol, timeframe)
      .then(setTfData)
      .catch(() =>
        setError(
          "Gagal memuat data BRG untuk timeframe ini. Data intraday (M1/M5/M30) sering terbatas untuk simbol tertentu."
        )
      )
      .finally(() => setLoading(false));
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!symbol) return;
    setSummary(null);
    fetchBrgSummary(symbol).catch(() => {}).then((data) => data && setSummary(data));
  }, [symbol]);

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
      {loading && <div className="loading-box">Memuat data BRG...</div>}
      {!loading && tfData && (
        <BrgChart rows={tfData.rows} zones={tfData.zones} projection={tfData.projection} />
      )}
      {summary && <BrgSummaryPanel summary={summary} />}
    </div>
  );
}
