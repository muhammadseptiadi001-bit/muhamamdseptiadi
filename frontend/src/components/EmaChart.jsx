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

export default function EmaChart({ rows }) {
  return (
    <div className="chart-block">
      <h3>Harga & EMA 8 / 21 / 125</h3>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={50} tickFormatter={formatTick} />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip labelFormatter={formatTick} />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} name="Close" />
          <Line type="monotone" dataKey="ema_fast" stroke="#f59e0b" dot={false} name="EMA 8" strokeWidth={1.5} />
          <Line type="monotone" dataKey="ema_mid" stroke="#ef4444" dot={false} name="EMA 21" strokeWidth={1.5} />
          <Line type="monotone" dataKey="ema_slow" stroke="#111827" dot={false} name="EMA 125" strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>

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
