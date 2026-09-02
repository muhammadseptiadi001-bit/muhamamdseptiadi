const VERDICT_LABEL = {
  NEUTRAL: "EMA masih berantakan / belum searah — tunggu sampai rapi",
  TREND_BULLISH: "Trend Bullish — tunggu harga pullback ke EMA 8/21",
  TREND_BEARISH: "Trend Bearish — tunggu harga pullback ke EMA 8/21",
  WAIT_BUY: "Sudah pullback — tunggu candle konfirmasi bullish",
  WAIT_SELL: "Sudah pullback — tunggu candle konfirmasi bearish",
  BUY_SETUP: "Setup BELI valid — semua syarat terpenuhi",
  SELL_SETUP: "Setup JUAL valid — semua syarat terpenuhi",
};

const VERDICT_CLASS = {
  NEUTRAL: "bias-neutral",
  TREND_BULLISH: "bias-neutral",
  TREND_BEARISH: "bias-neutral",
  WAIT_BUY: "status-waiting",
  WAIT_SELL: "status-waiting",
  BUY_SETUP: "bias-buy",
  SELL_SETUP: "bias-sell",
};

const CONFIRMATION_LABEL = {
  bullish_engulfing: "Bullish Engulfing",
  bullish_pin_bar: "Bullish Pin Bar / Rejection",
  bullish_close_above_ema: "Candle bullish menutup di atas EMA 8/21",
  bearish_engulfing: "Bearish Engulfing",
  bearish_pin_bar: "Bearish Pin Bar / Rejection",
  bearish_close_below_ema: "Candle bearish menutup di bawah EMA 8/21",
};

export default function EmaSetupPanel({ data }) {
  if (!data) return null;
  const { setup, trade_plan, disclaimer } = data;

  return (
    <div className="brg-summary-panel">
      <h3>Setup EMA 8/21/125 + RSI14</h3>

      <div className={`bias-banner ${VERDICT_CLASS[setup.verdict]}`}>
        {VERDICT_LABEL[setup.verdict] || setup.verdict}
      </div>

      <div className="brg-zone-grid">
        <div className="brg-zone-card">
          <span className="zone-tf-label">Harga</span>
          <span>{setup.price?.toFixed(4)}</span>
        </div>
        <div className="brg-zone-card">
          <span className="zone-tf-label">EMA 8 / 21 / 125</span>
          <span>
            {setup.ema_fast?.toFixed(4)} / {setup.ema_mid?.toFixed(4)} / {setup.ema_slow?.toFixed(4)}
          </span>
        </div>
        <div className="brg-zone-card">
          <span className="zone-tf-label">RSI 14</span>
          <span>{setup.rsi != null ? setup.rsi.toFixed(2) : "-"}</span>
        </div>
      </div>

      {setup.confirmation && (
        <div className="confluence-banner confluence-yes">
          Candle konfirmasi: <strong>{CONFIRMATION_LABEL[setup.confirmation] || setup.confirmation}</strong>
        </div>
      )}

      {trade_plan && (
        <div className="trade-plan-box">
          <h4>Rencana {trade_plan.direction === "BUY" ? "Beli" : "Jual"} (Entry / SL / TP)</h4>
          <div className="trade-plan-grid">
            <div className="trade-plan-item">
              <span className="tp-label">Entry</span>
              <span className="tp-value">{trade_plan.entry}</span>
            </div>
            <div className="trade-plan-item tp-sl">
              <span className="tp-label">Stop Loss (swing terdekat)</span>
              <span className="tp-value">{trade_plan.stop_loss}</span>
            </div>
            <div className="trade-plan-item tp-tp">
              <span className="tp-label">Take Profit (RR 1:{trade_plan.reward_ratio})</span>
              <span className="tp-value">{trade_plan.take_profit}</span>
            </div>
          </div>
        </div>
      )}

      <p className="disclaimer">{disclaimer}</p>
    </div>
  );
}
