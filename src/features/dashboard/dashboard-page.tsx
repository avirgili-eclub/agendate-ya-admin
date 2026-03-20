import { Activity, AlertTriangle, CalendarClock, RefreshCw } from "lucide-react";

import { useDashboardQuery } from "@/features/dashboard/use-dashboard-query";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { Button } from "@/shared/ui/button";

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <PageCard key={`kpi-skeleton-${idx}`} className="animate-pulse">
            <div className="h-3 w-24 rounded bg-neutral-dark" />
            <div className="mt-3 h-8 w-20 rounded bg-neutral-dark" />
          </PageCard>
        ))}
      </div>

      <PageCard className="animate-pulse">
        <div className="h-4 w-44 rounded bg-neutral-dark" />
        <div className="mt-3 h-24 rounded bg-neutral-dark" />
      </PageCard>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageCard>
      <div className="flex items-start gap-3">
        <span className="rounded-md bg-red-100 p-2 text-red-700">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-primary">No pudimos cargar el dashboard</h2>
          <p className="mt-1 text-sm text-primary-light">Revisa la conexion o intenta nuevamente.</p>
          <Button className="mt-3 gap-2" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-4" /> Reintentar
          </Button>
        </div>
      </div>
    </PageCard>
  );
}

function BookingStatusChip({ status }: { status: "CONFIRMED" | "PENDING" | "CANCELLED" }) {
  if (status === "CONFIRMED") {
    return <StatusChip tone="success" label="Confirmado" />;
  }
  if (status === "PENDING") {
    return <StatusChip tone="warning" label="Pendiente" />;
  }
  return <StatusChip tone="danger" label="Cancelado" />;
}

export function DashboardPage() {
  const dashboardQuery = useDashboardQuery();

  if (dashboardQuery.isLoading) {
    return <DashboardLoading />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <DashboardError onRetry={() => void dashboardQuery.refetch()} />;
  }

  const data = dashboardQuery.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <PageCard key={kpi.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">{kpi.label}</p>
              <p className="mt-1 text-3xl font-bold text-primary-dark">{kpi.value}</p>
              {kpi.trend ? <p className="mt-1 text-xs text-success-dark">{kpi.trend} vs semana anterior</p> : null}
            </div>
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <Activity className="size-5" />
            </span>
          </PageCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <PageCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">Proximos turnos</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <CalendarClock className="mr-1 inline size-3.5" /> Proximas 24h
            </span>
          </div>

          {data.upcomingBookings.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-neutral-dark p-6 text-sm text-primary-light">
              No hay turnos proximos para mostrar.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {data.upcomingBookings.map((booking) => (
                <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-dark p-3">
                  <div>
                    <p className="font-semibold text-primary-dark">{booking.clientName}</p>
                    <p className="text-sm text-primary-light">
                      {booking.serviceName} con {booking.resourceName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{booking.startsAtLabel}</span>
                    <BookingStatusChip status={booking.status} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </PageCard>

        <div className="space-y-4">
          <PageCard>
            <h2 className="text-lg font-semibold text-primary">Canales de origen</h2>
            <div className="mt-3 space-y-3">
              {data.sourceChannels.map((item) => (
                <div key={item.channel}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-primary-dark">{item.channel}</span>
                    <span className="text-primary-light">{item.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-dark">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PageCard>

          <PageCard>
            <h2 className="text-lg font-semibold text-primary">Alertas operativas</h2>
            <ul className="mt-3 space-y-2">
              {data.alerts.length === 0 ? (
                <li className="rounded-lg border border-dashed border-neutral-dark p-3 text-sm text-primary-light">
                  Sin alertas por ahora.
                </li>
              ) : (
                data.alerts.map((alert) => (
                  <li key={alert} className="rounded-lg bg-secondary/10 px-3 py-2 text-sm text-secondary-dark">
                    {alert}
                  </li>
                ))
              )}
            </ul>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
