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

const CONFIDENCE_LABEL = {
  tinggi: "Confluence terpenuhi (M1 di dalam M5 + searah H4)",
  rendah: "Confluence belum penuh — hitungan ini baru berlaku KALAU zona ini valid",
};

const STATUS_LABEL = {
  TP_HIT: "Target tercapai — saatnya JUAL ambil untung",
  SL_HIT: "Kena Stop Loss — sebaiknya keluar untuk batasi rugi",
  IN_POSITION: "Posisi berjalan — pantau terus sampai TP atau SL tersentuh",
  WAITING: "Belum masuk area entry — harga belum sampai level Entry",
};

const STATUS_CLASS = {
  TP_HIT: "status-tp",
  SL_HIT: "status-sl",
  IN_POSITION: "status-active",
  WAITING: "status-waiting",
};

export default function BrgSummaryPanel({ summary }) {
  if (!summary) return null;
  const { h4, m5, m1, m1_inside_m5, entry_confluence, trade_plan, disclaimer } = summary;

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

      {trade_plan && (
        <div className="trade-plan-box">
          <h4>
            Rencana {trade_plan.direction === "BUY" ? "Beli" : "Jual"} (Entry / SL / TP)
          </h4>

          {trade_plan.status && (
            <div className={`status-banner ${STATUS_CLASS[trade_plan.status]}`}>
              {STATUS_LABEL[trade_plan.status]}
            </div>
          )}

          <div className="trade-plan-grid">
            {trade_plan.current_price != null && (
              <div className="trade-plan-item">
                <span className="tp-label">Harga Sekarang</span>
                <span className="tp-value">{trade_plan.current_price}</span>
              </div>
            )}
            <div className="trade-plan-item">
              <span className="tp-label">Entry</span>
              <span className="tp-value">{trade_plan.entry}</span>
            </div>
            <div className="trade-plan-item tp-sl">
              <span className="tp-label">Stop Loss (cut loss)</span>
              <span className="tp-value">{trade_plan.stop_loss}</span>
            </div>
            <div className="trade-plan-item tp-tp">
              <span className="tp-label">Take Profit (jual di sini)</span>
              <span className="tp-value">{trade_plan.take_profit}</span>
            </div>
          </div>
          <p className="tp-confidence">{CONFIDENCE_LABEL[trade_plan.confidence]}</p>
          <p className="disclaimer">
            SL diletakkan di luar zona (+buffer volatilitas/ATR), TP dihitung dari rasio
            risk:reward 1:{trade_plan.reward_ratio} terhadap jarak SL &mdash; ini rumus manajemen
            risiko umum, BUKAN jaminan harga akan sampai ke level TP. Harga bisa saja balik arah
            dan kena SL duluan.
          </p>
        </div>
      )}

      <p className="disclaimer">{disclaimer}</p>
    </div>
  );
}
