import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/features/metrics/metrics-formatters";
import type { RevenueComparisonPeriod, RevenueComparisonResponse } from "@/features/metrics/metrics-types";
import { Button } from "@/shared/ui/button";

type RevenueComparisonChartProps = {
  comparison?: RevenueComparisonResponse;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

type RevenueComparisonChartPoint = {
  label: string;
  currentRevenue: number;
  previousRevenue: number | null;
  currentDateLabel: string;
  previousDateLabel: string;
};

type RevenueComparisonTooltipPayload = {
  payload?: RevenueComparisonChartPoint;
};

type RevenueComparisonTooltipProps = {
  active?: boolean;
  payload?: RevenueComparisonTooltipPayload[];
};

const COMPACT_CHART_INITIAL_DIMENSION = { width: 1, height: 288 };

const WEEK_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

function translateRevenuePointLabel(label: string, period: RevenueComparisonPeriod) {
  if (period === "week") {
    return WEEK_LABELS[label] ?? label;
  }

  return label;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Sin día equivalente";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateRangeLabel(from: string | null, to: string | null) {
  if (!from || !to) {
    return "Sin día equivalente";
  }

  if (from === to) {
    return formatDateLabel(from);
  }

  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
}

function formatDeltaPercentage(value: number | null) {
  if (value === null) {
    return "Sin base anterior";
  }

  return new Intl.NumberFormat("es-PY", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);
}

function getSeriesLabels(period: RevenueComparisonPeriod) {
  return period === "week"
    ? { current: "Semana actual", previous: "Semana anterior" }
    : { current: "Mes actual", previous: "Mes anterior" };
}

function getRevenueComparisonChartData(comparison: RevenueComparisonResponse): RevenueComparisonChartPoint[] {
  if (comparison.period === "week") {
    return comparison.points.map((point) => ({
      label: translateRevenuePointLabel(point.label, comparison.period),
      currentDateLabel: formatDateLabel(point.currentDate),
      previousDateLabel: formatDateLabel(point.previousDate),
      currentRevenue: point.currentRevenue,
      previousRevenue: point.previousDate === null ? null : point.previousRevenue ?? 0,
    }));
  }

  const buckets = new Map<
    number,
    {
      currentFrom: string;
      currentTo: string;
      previousFrom: string | null;
      previousTo: string | null;
      currentRevenue: number;
      previousRevenue: number;
      hasPreviousDate: boolean;
    }
  >();

  for (const point of comparison.points) {
    const weekIndex = Math.ceil(point.index / 7);
    const bucket = buckets.get(weekIndex);

    if (!bucket) {
      buckets.set(weekIndex, {
        currentFrom: point.currentDate,
        currentTo: point.currentDate,
        previousFrom: point.previousDate,
        previousTo: point.previousDate,
        currentRevenue: point.currentRevenue,
        previousRevenue: point.previousDate === null ? 0 : point.previousRevenue ?? 0,
        hasPreviousDate: point.previousDate !== null,
      });
      continue;
    }

    bucket.currentTo = point.currentDate;
    bucket.currentRevenue += point.currentRevenue;

    if (point.previousDate !== null) {
      bucket.previousFrom ??= point.previousDate;
      bucket.previousTo = point.previousDate;
      bucket.previousRevenue += point.previousRevenue ?? 0;
      bucket.hasPreviousDate = true;
    }
  }

  return Array.from(buckets.entries()).map(([weekIndex, bucket]) => ({
    label: `Semana ${weekIndex}`,
    currentDateLabel: formatDateRangeLabel(bucket.currentFrom, bucket.currentTo),
    previousDateLabel: formatDateRangeLabel(bucket.previousFrom, bucket.previousTo),
    currentRevenue: bucket.currentRevenue,
    previousRevenue: bucket.hasPreviousDate ? bucket.previousRevenue : null,
  }));
}

function RevenueComparisonTooltip({ active, payload }: RevenueComparisonTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-dark bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-primary-dark">{point.label}</p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-4 text-primary">
          <span>Actual · {point.currentDateLabel}</span>
          <span className="font-semibold">{formatCurrency(point.currentRevenue)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-primary">
          <span>Anterior · {point.previousDateLabel}</span>
          <span className="font-semibold">
            {point.previousRevenue === null ? "Sin dato" : formatCurrency(point.previousRevenue)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function RevenueComparisonChart({
  comparison,
  isLoading = false,
  isError = false,
  onRetry,
}: RevenueComparisonChartProps) {
  const currency = comparison?.meta.currency ?? "PYG";
  const labels = getSeriesLabels(comparison?.period ?? "week");
  const data = comparison ? getRevenueComparisonChartData(comparison) : [];

  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary-dark">Ingresos: Actual vs Anterior</h2>
          <p className="text-xs text-primary-light">
            Comparación acumulada hasta {formatDateLabel(comparison?.meta.anchor ?? null)}.
          </p>
        </div>
        {comparison && (
          <div className="rounded-lg bg-white px-3 py-2 text-right">
            <p className="text-xs text-primary-light">Variación</p>
            <p className={`text-sm font-semibold ${comparison.delta.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatDeltaPercentage(comparison.delta.percentage)}
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="h-72 animate-pulse rounded-lg bg-white" aria-label="Cargando comparación de ingresos" />
      )}

      {isError && !isLoading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-dark bg-white p-4 text-center">
          <div>
            <p className="font-semibold text-primary-dark">No pudimos cargar la comparación de ingresos</p>
            <p className="mt-1 text-sm text-primary-light">El resto de métricas puede seguir disponible.</p>
          </div>
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && comparison && (
        <div className="h-72 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={288}
            initialDimension={COMPACT_CHART_INITIAL_DIMENSION}
          >
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="currentRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f63e6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4f63e6" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="previousRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#85d6ef" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#85d6ef" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={true} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tick={{ fontSize: 12, fill: "#374151" }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
                width={96}
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<RevenueComparisonTooltip />} />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              <Area
                type="monotone"
                dataKey="currentRevenue"
                name={labels.current}
                stroke="#4f63e6"
                strokeWidth={2}
                fill="url(#currentRevenueGradient)"
                dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="previousRevenue"
                name={labels.previous}
                stroke="#85d6ef"
                strokeWidth={2}
                fill="url(#previousRevenueGradient)"
                dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
