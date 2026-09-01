import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function PriceChart({ rows }) {
  return (
    <div className="chart-block">
      <h3>Harga & Moving Average</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} name="Close" />
          <Line type="monotone" dataKey="sma20" stroke="#f59e0b" dot={false} name="SMA 20" />
          <Line type="monotone" dataKey="sma50" stroke="#10b981" dot={false} name="SMA 50" />
        </ComposedChart>
      </ResponsiveContainer>

      <h3>RSI (14)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="rsi14" stroke="#8b5cf6" dot={false} name="RSI 14" />
        </ComposedChart>
      </ResponsiveContainer>

      <h3>MACD</h3>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="macd" stroke="#ef4444" dot={false} name="MACD" />
          <Line type="monotone" dataKey="macd_signal" stroke="#0ea5e9" dot={false} name="Signal" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
