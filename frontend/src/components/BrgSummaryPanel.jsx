const BIAS_LABEL = {
  BUY: "Cenderung Beli (breakout atas channel)",
  SELL: "Cenderung Jual (breakdown bawah channel)",
  NEUTRAL: "Netral / masih di dalam channel",
};

const BIAS_CLASS = {
  BUY: "bias-buy",
  SELL: "bias-sell",
  NEUTRAL: "bias-neutral",
};

function zoneText(zone) {
  if (!zone) return "Tidak ada zona aktif terdeteksi";
  const label = zone.type === "demand" ? "Demand" : "Supply";
  const mitigated = zone.mitigated ? " (sudah tersentuh ulang)" : "";
  return `${label}: ${zone.bottom.toFixed(4)} - ${zone.top.toFixed(4)}${mitigated}`;
}

export default function BrgSummaryPanel({ summary }) {
  if (!summary) return null;
  const { h4, m5, m1, m1_inside_m5, entry_confluence, disclaimer } = summary;

  return (
    <div className="brg-summary-panel">
      <h3>Ringkasan Multi-Timeframe (Metode BRG)</h3>

      <div className={`bias-banner ${BIAS_CLASS[h4.bias.bias]}`}>
        Bias H4: {BIAS_LABEL[h4.bias.bias]}
      </div>

      <div className="brg-zone-grid">
        <div className="brg-zone-card">
          <span className="zone-tf-label">H4</span>
          <span>{h4.zone_count} zona terdeteksi dalam data historis</span>
        </div>
        <div className="brg-zone-card">
          <span className="zone-tf-label">M5</span>
          <span>{zoneText(m5.active_zone)}</span>
        </div>
        <div className="brg-zone-card">
          <span className="zone-tf-label">M1</span>
          <span>{zoneText(m1.active_zone)}</span>
        </div>
      </div>

      <div className={`confluence-banner ${entry_confluence ? "confluence-yes" : "confluence-no"}`}>
        {m1_inside_m5
          ? "Zona aktif M1 berada di dalam zona aktif M5."
          : "Zona aktif M1 belum bersinggungan dengan zona aktif M5."}
        {entry_confluence && " Ditambah bias H4 searah — ini yang disebut confluence di metode BRG."}
      </div>

      <p className="disclaimer">{disclaimer}</p>
    </div>
  );
}
