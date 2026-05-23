import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricsGranularity, MetricsSeriesBucket } from "@/features/metrics/metrics-types";
import { formatBucketLabel, formatCurrency, formatInteger } from "@/features/metrics/metrics-formatters";

type RevenueBookingsChartProps = {
  series: MetricsSeriesBucket[];
  granularity: MetricsGranularity;
  currency: string;
};

const COMPACT_CHART_INITIAL_DIMENSION = { width: 1, height: 256 };

export function RevenueBookingsChart({ series, granularity, currency }: RevenueBookingsChartProps) {
  const data = series.map((bucket) => ({
    label: formatBucketLabel(bucket.periodStart, granularity),
    revenueCompleted: bucket.revenueCompleted,
    completedCount: bucket.completedCount,
  }));

  return (
    <section className="rounded-lg border border-neutral-dark bg-neutral-light p-3 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-primary-dark">Ingresos realizados y reservas</h2>
        <p className="text-xs text-primary-light">Ingresos realizados corresponden solo a reservas completadas.</p>
      </div>
      <div className="h-64 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={256}
          initialDimension={COMPACT_CHART_INITIAL_DIMENSION}
        >
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="revenue" tickFormatter={(value) => formatCurrency(Number(value), currency)} width={88} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="count" orientation="right" tickFormatter={(value) => formatInteger(Number(value))} width={40} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, _name, payloadEntry) => {
                const dataKey =
                  typeof payloadEntry === "object" &&
                  payloadEntry !== null &&
                  "dataKey" in payloadEntry &&
                  typeof payloadEntry.dataKey === "string"
                    ? payloadEntry.dataKey
                    : "";

                if (dataKey === "revenueCompleted") {
                  return [formatCurrency(Number(value), currency), "Ingresos realizados"];
                }
                return [formatInteger(Number(value)), "Reservas completadas"];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="revenue" dataKey="revenueCompleted" name="Ingresos realizados" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="count" dataKey="completedCount" name="Reservas completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
