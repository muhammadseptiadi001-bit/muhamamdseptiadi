import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";

const ZONE_COLOR = {
  demand: "#10b981",
  supply: "#ef4444",
};

function formatTick(value) {
  if (!value) return value;
  return value.length > 10 ? value.slice(5, 16).replace("T", " ") : value;
}

function withProjection(rows, projection) {
  if (!projection || projection.length === 0 || rows.length === 0) return rows;
  const lastRow = rows[rows.length - 1];
  const bridge = {
    ...lastRow,
    channel_upper_future: lastRow.channel_upper,
    channel_lower_future: lastRow.channel_lower,
  };
  const futureRows = projection.map((p) => ({
    date: p.date,
    channel_upper_future: p.channel_upper,
    channel_lower_future: p.channel_lower,
  }));
  return [...rows.slice(0, -1), bridge, ...futureRows];
}

export default function BrgChart({ rows, zones, projection }) {
  const data = withProjection(rows, projection);
  return (
    <div className="chart-block">
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" minTickGap={50} tickFormatter={formatTick} />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip labelFormatter={formatTick} />
          <Legend />

          {zones.map((zone, i) => (
            <ReferenceArea
              key={`${zone.start}-${i}`}
              x1={zone.start}
              x2={zone.end}
              y1={zone.bottom}
              y2={zone.top}
              fill={ZONE_COLOR[zone.type]}
              fillOpacity={zone.mitigated ? 0.08 : 0.25}
              stroke={ZONE_COLOR[zone.type]}
              strokeOpacity={0.5}
            />
          ))}

          <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} name="Close" />
          <Line
            type="monotone"
            dataKey="channel_upper"
            stroke="#f59e0b"
            dot={false}
            name="Channel Atas"
            strokeDasharray="4 2"
          />
          <Line
            type="monotone"
            dataKey="channel_lower"
            stroke="#f59e0b"
            dot={false}
            name="Channel Bawah"
            strokeDasharray="4 2"
          />
          <Line
            type="monotone"
            dataKey="channel_upper_future"
            stroke="#f59e0b"
            strokeOpacity={0.5}
            dot={false}
            name="Channel Atas (proyeksi)"
            strokeDasharray="2 4"
          />
          <Line
            type="monotone"
            dataKey="channel_lower_future"
            stroke="#f59e0b"
            strokeOpacity={0.5}
            dot={false}
            name="Channel Bawah (proyeksi)"
            strokeDasharray="2 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="zone-legend">
        <span className="legend-dot" style={{ background: ZONE_COLOR.demand }} /> Demand (potensi Buy) &nbsp;
        <span className="legend-dot" style={{ background: ZONE_COLOR.supply }} /> Supply (potensi Sell) &nbsp;
        &mdash; kotak pudar berarti zona sudah pernah disentuh ulang (mitigated). Garis titik-titik pudar di
        ujung kanan = proyeksi lanjutan channel, bukan ramalan harga.
      </p>
    </div>
  );
}
