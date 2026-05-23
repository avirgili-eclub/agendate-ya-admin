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

export function OccupancyChart({ series, granularity }: OccupancyChartProps) {
  const data = series.map((bucket) => ({
    label: formatBucketLabel(bucket.periodStart, granularity),
    occupancyRate: bucket.occupancyRate,
  }));

  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-primary-dark">Ocupacion</h2>
        <p className="text-sm text-primary-light">Si la capacidad no esta configurada, se muestra como no disponible.</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} tickFormatter={(value) => formatPercentage(Number(value))} width={56} />
            <Tooltip formatter={(value) => [formatPercentage(value === null ? null : Number(value)), "Ocupacion"]} />
            <Line type="monotone" dataKey="occupancyRate" name="Ocupacion" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
