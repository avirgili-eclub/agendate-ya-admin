import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricsGranularity, MetricsSeriesBucket } from "@/features/metrics/metrics-types";
import { formatBucketLabel, formatPercentage } from "@/features/metrics/metrics-formatters";

type OccupancyChartProps = {
  series: MetricsSeriesBucket[];
  granularity: MetricsGranularity;
};

const COMPACT_CHART_INITIAL_DIMENSION = { width: 1, height: 256 };

export function OccupancyChart({ series, granularity }: OccupancyChartProps) {
  const data = series.map((bucket) => ({
    label: formatBucketLabel(bucket.periodStart, granularity),
    occupancyRate: bucket.occupancyRate,
  }));

  return (
    <section className="rounded-lg border border-neutral-dark bg-neutral-light p-3 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-primary-dark">Ocupación</h2>
        <p className="text-xs text-primary-light">Si la capacidad no está configurada, se muestra como no disponible.</p>
      </div>
      <div className="h-64 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={256}
          initialDimension={COMPACT_CHART_INITIAL_DIMENSION}
        >
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tickFormatter={(value) => formatPercentage(Number(value))} width={56} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [formatPercentage(value === null ? null : Number(value)), "Ocupación"]} />
            <Line type="monotone" dataKey="occupancyRate" name="Ocupación" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
