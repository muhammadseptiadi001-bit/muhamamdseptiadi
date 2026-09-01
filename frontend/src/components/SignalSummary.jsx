const VERDICT_LABEL = {
  STRONG_BUY: "Beli Kuat",
  BUY: "Beli",
  NEUTRAL: "Netral",
  SELL: "Jual",
  STRONG_SELL: "Jual Kuat",
};

const SIGNAL_LABEL = {
  BUY: "Beli",
  SELL: "Jual",
  NEUTRAL: "Netral",
};

export default function SignalSummary({ analysis }) {
  if (!analysis) return null;

  const verdictClass = analysis.verdict.toLowerCase().replace("_", "-");

  return (
    <div className="signal-panel">
      <h3>Ringkasan Sinyal Teknikal (per {analysis.as_of})</h3>

      <div className={`verdict-banner verdict-${verdictClass}`}>
        {VERDICT_LABEL[analysis.verdict] || analysis.verdict}
        <span className="verdict-tally">
          {analysis.buy_count} Beli &middot; {analysis.neutral_count} Netral &middot; {analysis.sell_count} Jual
        </span>
      </div>

      <div className="indicator-grid">
        {Object.entries(analysis.indicators).map(([key, item]) => (
          <div key={key} className="indicator-card">
            <span className="indicator-label">{item.label}</span>
            <span className={`indicator-badge badge-${item.signal.toLowerCase()}`}>
              {SIGNAL_LABEL[item.signal] || item.signal}
            </span>
            {item.value !== undefined && item.value !== null && (
              <span className="indicator-value">{item.value}</span>
            )}
          </div>
        ))}
      </div>

      <p className="disclaimer">{analysis.disclaimer}</p>
    </div>
  );
}
