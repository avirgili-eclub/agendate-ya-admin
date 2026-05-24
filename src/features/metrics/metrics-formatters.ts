import type { MetricsGranularity, MetricsMeta } from "@/features/metrics/metrics-types";

export const DEFAULT_METRICS_GRANULARITY: MetricsGranularity = "day";

export function formatCurrency(value: number, currency = "PYG") {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(value);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(value);
}

export function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Sin configurar";
  }

  return new Intl.NumberFormat("es-PY", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatBucketLabel(bucketDate: string, granularity: MetricsGranularity) {
  if (!bucketDate) {
    return "-";
  }

  const [datePart] = bucketDate.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month) {
    return bucketDate;
  }

  if (granularity === "month") {
    return `${month}/${year}`;
  }

  if (!day) {
    return datePart;
  }

  return `${day}/${month}`;
}

export function getMetricsCurrency(meta?: Pick<MetricsMeta, "currency"> | null) {
  return meta?.currency || "PYG";
}
