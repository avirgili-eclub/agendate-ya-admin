import { Activity, Ban, CalendarCheck, CheckCircle2, DollarSign, Percent } from "lucide-react";

import type { MetricsTotals } from "@/features/metrics/metrics-types";
import { formatCurrency, formatInteger, formatPercentage } from "@/features/metrics/metrics-formatters";

type MetricsKpiGridProps = {
  totals: MetricsTotals;
  currency: string;
};

export function MetricsKpiGrid({ totals, currency }: MetricsKpiGridProps) {
  const cards = [
    {
      label: "Ingresos realizados",
      value: formatCurrency(totals.revenueCompleted, currency),
      detail: "Reservas completadas solamente",
      icon: DollarSign,
    },
    {
      label: "Reservas",
      value: formatInteger(totals.bookingsCount),
      detail: `${formatInteger(totals.completedCount)} completadas`,
      icon: CalendarCheck,
    },
    {
      label: "Tasa de finalizacion",
      value: formatPercentage(totals.completionRate),
      detail: "Completadas sobre reservas",
      icon: CheckCircle2,
    },
    {
      label: "No show",
      value: formatPercentage(totals.noShowRate),
      detail: `${formatInteger(totals.noShowCount)} reservas`,
      icon: Ban,
    },
    {
      label: "Cancelaciones",
      value: formatPercentage(totals.cancellationRate),
      detail: `${formatInteger(totals.cancelledCount)} reservas`,
      icon: Percent,
    },
    {
      label: "Ocupacion promedio",
      value: formatPercentage(totals.averageOccupancyRate),
      detail:
        totals.averageOccupancyRate === null
          ? "Capacidad sin configurar"
          : `${formatInteger(totals.daysWithKnownCapacity)} dias con capacidad`,
      icon: Activity,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores principales">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary-light">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-primary-dark">{card.value}</p>
              <p className="mt-1 text-xs text-primary-light">{card.detail}</p>
            </div>
            <span className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
              <card.icon className="size-5" />
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
