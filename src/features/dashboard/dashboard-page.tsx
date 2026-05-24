import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CalendarClock, Loader2, RefreshCw } from "lucide-react";

import { useDashboardQuery } from "@/features/dashboard/use-dashboard-query";
import { useDashboardUpcomingBookingsQuery } from "@/features/dashboard/use-dashboard-upcoming-bookings-query";
import { BookingDetailPanel } from "@/features/bookings/components/booking-detail-panel";
import { BookingKindBadge } from "@/features/bookings/components/booking-kind-badge";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { Button } from "@/shared/ui/button";
import { SidePanel } from "@/shared/ui/side-panel";

function DashboardLoading() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <PageCard key={`kpi-skeleton-${idx}`} className="animate-pulse p-3.5 sm:p-4">
            <div className="h-2.5 w-20 rounded bg-neutral-dark sm:h-3 sm:w-24" />
            <div className="mt-2.5 h-7 w-16 rounded bg-neutral-dark sm:mt-3 sm:h-8 sm:w-20" />
          </PageCard>
        ))}
      </div>

      <PageCard className="animate-pulse p-3.5 sm:p-4">
        <div className="h-3.5 w-36 rounded bg-neutral-dark sm:h-4 sm:w-44" />
        <div className="mt-2.5 h-20 rounded bg-neutral-dark sm:mt-3 sm:h-24" />
      </PageCard>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageCard className="p-3.5 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="rounded-md bg-red-100 p-1.5 text-red-700 sm:p-2">
          <AlertTriangle className="size-4 sm:size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-primary sm:text-lg">No pudimos cargar el dashboard</h2>
          <p className="mt-1 text-xs text-primary-light sm:text-sm">Revisa la conexion o intenta nuevamente.</p>
          <Button className="mt-2.5 h-8 gap-1.5 px-3 text-xs sm:mt-3 sm:h-9 sm:gap-2 sm:text-sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-3.5 sm:size-4" /> Reintentar
          </Button>
        </div>
      </div>
    </PageCard>
  );
}

function BookingStatusChip({ status }: { status: "CONFIRMED" | "PENDING" | "CANCELLED" }) {
  if (status === "CONFIRMED") {
    return <StatusChip tone="success" label="Confirmado" className="px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]" />;
  }
  if (status === "PENDING") {
    return <StatusChip tone="warning" label="Pendiente" className="px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]" />;
  }
  return <StatusChip tone="danger" label="Cancelado" className="px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]" />;
}

export function DashboardPage() {
  const [upcomingPageSize, setUpcomingPageSize] = useState(() => {
    if (typeof window === "undefined") {
      return 20;
    }

    return window.matchMedia("(max-width: 639px)").matches ? 8 : 20;
  });
  const dashboardQuery = useDashboardQuery();
  const upcomingBookingsQuery = useDashboardUpcomingBookingsQuery(upcomingPageSize);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const upcomingContainerRef = useRef<HTMLDivElement>(null);
  const upcomingBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const syncPageSize = () => {
      setUpcomingPageSize(mediaQuery.matches ? 8 : 20);
    };

    syncPageSize();
    mediaQuery.addEventListener("change", syncPageSize);

    return () => {
      mediaQuery.removeEventListener("change", syncPageSize);
    };
  }, []);

  useEffect(() => {
    const root = upcomingContainerRef.current;
    const target = upcomingBottomRef.current;

    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        if (!upcomingBookingsQuery.hasNextPage || upcomingBookingsQuery.isFetchingNextPage) {
          return;
        }

        void upcomingBookingsQuery.fetchNextPage();
      },
      {
        root,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [
    upcomingBookingsQuery.fetchNextPage,
    upcomingBookingsQuery.hasNextPage,
    upcomingBookingsQuery.isFetchingNextPage,
  ]);

  if (dashboardQuery.isLoading) {
    return <DashboardLoading />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <DashboardError onRetry={() => void dashboardQuery.refetch()} />;
  }

  const data = dashboardQuery.data;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {data.kpis.map((kpi) => (
          <PageCard key={kpi.label} className="flex items-center justify-between p-3.5 sm:p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary-light sm:text-xs">{kpi.label}</p>
              <p className="mt-1 text-[1.6rem] font-bold text-primary-dark sm:text-3xl">{kpi.value}</p>
              {kpi.trend ? <p className="mt-1 text-[11px] text-success-dark sm:text-xs">{kpi.trend}</p> : null}
            </div>
            <span className="rounded-full bg-primary/10 p-1.5 text-primary sm:p-2">
              <Activity className="size-4 sm:size-5" />
            </span>
          </PageCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr] sm:gap-4">
        <PageCard className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2.5 sm:gap-3">
            <h2 className="text-base font-semibold text-primary sm:text-lg">Proximos turnos</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary sm:px-2.5 sm:py-1 sm:text-xs">
              <CalendarClock className="mr-1 inline size-3 sm:size-3.5" /> Proximas 24h
            </span>
          </div>
          <p className="mt-1 text-[11px] text-primary-light sm:text-xs">Toca un turno para ver su detalle.</p>

          {upcomingBookingsQuery.isPending ? (
            <div className="mt-2.5 rounded-lg border border-dashed border-neutral-dark p-4 text-xs text-primary-light sm:mt-3 sm:p-6 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin sm:size-4" />
                Cargando turnos...
              </span>
            </div>
          ) : upcomingBookingsQuery.isError ? (
            <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:mt-3 sm:p-4 sm:text-sm">
              No pudimos cargar los próximos turnos.
            </div>
          ) : upcomingBookingsQuery.bookings.length === 0 ? (
            <div className="mt-2.5 rounded-lg border border-dashed border-neutral-dark p-4 text-xs text-primary-light sm:mt-3 sm:p-6 sm:text-sm">
              No hay turnos proximos para mostrar.
            </div>
          ) : (
            <div
              ref={upcomingContainerRef}
              className="mt-2.5 max-h-[380px] space-y-1.5 overflow-y-auto pr-1 scroll-smooth sm:mt-3 sm:max-h-[420px] sm:space-y-2"
            >
              {upcomingBookingsQuery.bookings.map((booking) => (
                <article key={booking.id} className="rounded-lg border border-neutral-dark transition-colors hover:border-primary/30">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="w-full p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light sm:p-3"
                    aria-label={`Ver detalle del turno de ${booking.clientName}`}
                  >
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary-dark sm:text-base">{booking.clientName}</p>
                        <p className="text-xs text-primary-light sm:text-sm">
                          {booking.serviceName} con {booking.resourceName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5 sm:shrink-0 sm:gap-2 sm:pt-0">
                        <span className="text-xs font-semibold text-primary sm:text-sm">{booking.startsAtLabel}</span>
                        <BookingKindBadge kind={booking.bookingKind} />
                        <BookingStatusChip status={booking.status} />
                      </div>
                    </div>
                  </button>
                </article>
              ))}

              <div ref={upcomingBottomRef} className="h-1 w-full" />

              {upcomingBookingsQuery.isFetchingNextPage && (
                <div className="pb-2 text-center text-[11px] text-primary-light sm:text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral px-2.5 py-0.5 sm:px-3 sm:py-1">
                    <Loader2 className="size-3 animate-spin" />
                    Cargando más turnos...
                  </span>
                </div>
              )}

              {!upcomingBookingsQuery.hasNextPage && (
                <p className="pb-2 text-center text-[11px] text-primary-light sm:text-xs">
                  No hay más turnos dentro de las próximas 24h.
                </p>
              )}
            </div>
          )}
        </PageCard>

        <div className="space-y-3 sm:space-y-4">
          <PageCard className="p-3.5 sm:p-4">
            <h2 className="text-base font-semibold text-primary sm:text-lg">Canales de origen</h2>
            <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
              {data.sourceChannels.map((item) => (
                <div key={item.channel}>
                  <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-primary-dark">{item.channel}</span>
                    <span className="text-primary-light">{item.percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-dark sm:h-2">
                    <div className="h-1.5 rounded-full bg-primary sm:h-2" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PageCard>

          <PageCard className="p-3.5 sm:p-4">
            <h2 className="text-base font-semibold text-primary sm:text-lg">Alertas operativas</h2>
            <ul className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
              {data.alerts.length === 0 ? (
                <li className="rounded-lg border border-dashed border-neutral-dark p-2.5 text-xs text-primary-light sm:p-3 sm:text-sm">
                  Sin alertas por ahora.
                </li>
              ) : (
                data.alerts.map((alert) => (
                  <li
                    key={`${alert.code}-${alert.message}`}
                    className={`rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${
                      alert.severity === "warning"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-secondary/10 text-secondary-dark"
                    }`}
                  >
                    {alert.message}
                  </li>
                ))
              )}
            </ul>
          </PageCard>
        </div>
      </div>

      <SidePanel
        isOpen={!!selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        title="Detalle del Turno"
      >
        {selectedBookingId && (
          <BookingDetailPanel
            bookingId={selectedBookingId}
            onClose={() => setSelectedBookingId(null)}
            onRefresh={() => {
              void Promise.all([dashboardQuery.refetch(), upcomingBookingsQuery.refetch()]);
            }}
          />
        )}
      </SidePanel>
    </div>
  );
}
