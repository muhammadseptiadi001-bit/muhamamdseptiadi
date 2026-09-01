export default function PredictionPanel({ prediction }) {
  if (!prediction) return null;

  if (!prediction.available) {
    return (
      <div className="prediction-panel">
        <h3>Estimasi Tren</h3>
        <p>{prediction.reason}</p>
      </div>
    );
  }

  const upPct = Math.round(prediction.probability_up * 100);
  const downPct = Math.round(prediction.probability_down * 100);
  const trend = upPct >= downPct ? "NAIK" : "TURUN";

  return (
    <div className="prediction-panel">
      <h3>Estimasi Tren (per {prediction.as_of})</h3>
      <div className="prediction-bars">
        <div className="bar-row">
          <span>Naik</span>
          <div className="bar-track">
            <div className="bar-fill up" style={{ width: `${upPct}%` }} />
          </div>
          <span>{upPct}%</span>
        </div>
        <div className="bar-row">
          <span>Turun</span>
          <div className="bar-track">
            <div className="bar-fill down" style={{ width: `${downPct}%` }} />
          </div>
          <span>{downPct}%</span>
        </div>
      </div>
      <p className="trend-label">
        Kecenderungan model: <strong>{trend}</strong> &middot; Akurasi backtest:{" "}
        {Math.round(prediction.backtest_accuracy * 100)}% (dari {prediction.backtest_samples} sampel data lampau)
      </p>
      <p className="disclaimer">{prediction.disclaimer}</p>
    </div>
  );
}
