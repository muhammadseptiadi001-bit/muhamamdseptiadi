import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

function formatTick(value) {
  if (!value) return value;
  return value.length > 10 ? value.slice(5, 16).replace("T", " ") : value;
}

function withProjection(rows, projection) {
  if (!projection || projection.length === 0 || rows.length === 0) return rows;
  const lastRow = rows[rows.length - 1];
  const bridge = {
    ...lastRow,
    ema_fast_future: lastRow.ema_fast,
    ema_mid_future: lastRow.ema_mid,
    ema_slow_future: lastRow.ema_slow,
  };
  const futureRows = projection.map((p) => ({
    date: p.date,
    ema_fast_future: p.ema_fast,
    ema_mid_future: p.ema_mid,
    ema_slow_future: p.ema_slow,
  }));
  return [...rows.slice(0, -1), bridge, ...futureRows];
}

export default function EmaChart({ rows, projection }) {
  const data = withProjection(rows, projection);
  return (
    <div className="chart-block">
      <h3>Harga & EMA 8 / 21 / 125</h3>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={50} tickFormatter={formatTick} />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip labelFormatter={formatTick} />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} name="Close" />
          <Line type="monotone" dataKey="ema_fast" stroke="#f59e0b" dot={false} name="EMA 8" strokeWidth={1.5} />
          <Line type="monotone" dataKey="ema_mid" stroke="#ef4444" dot={false} name="EMA 21" strokeWidth={1.5} />
          <Line type="monotone" dataKey="ema_slow" stroke="#111827" dot={false} name="EMA 125" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="ema_fast_future"
            stroke="#f59e0b"
            strokeOpacity={0.5}
            dot={false}
            name="EMA 8 (proyeksi)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
          <Line
            type="monotone"
            dataKey="ema_mid_future"
            stroke="#ef4444"
            strokeOpacity={0.5}
            dot={false}
            name="EMA 21 (proyeksi)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
          <Line
            type="monotone"
            dataKey="ema_slow_future"
            stroke="#111827"
            strokeOpacity={0.5}
            dot={false}
            name="EMA 125 (proyeksi)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="zone-legend">
        Garis titik-titik pudar di ujung kanan = proyeksi lanjutan kemiringan EMA saat ini, bukan
        ramalan harga.
      </p>

      <h3>RSI (14)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={50} tickFormatter={formatTick} />
          <YAxis domain={[0, 100]} />
          <Tooltip labelFormatter={formatTick} />
          <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" dot={false} name="RSI 14" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
