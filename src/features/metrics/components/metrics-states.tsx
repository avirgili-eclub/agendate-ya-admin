import { AlertTriangle, CalendarX2, Lock, UserRoundCheck } from "lucide-react";

import { MetricsKpiGrid } from "@/features/metrics/components/metrics-kpi-grid";
import { OccupancyChart } from "@/features/metrics/components/occupancy-chart";
import { RevenueBookingsChart } from "@/features/metrics/components/revenue-bookings-chart";
import { TopClientsCard } from "@/features/metrics/components/top-clients-card";
import { TopResourcesCard } from "@/features/metrics/components/top-resources-card";
import { TopServicesCard } from "@/features/metrics/components/top-services-card";
import { getMetricsCurrency } from "@/features/metrics/metrics-formatters";
import { LOCKED_METRICS_PREVIEW_DATA } from "@/features/metrics/metrics-locked-preview-data";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState, SkeletonCards } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";

type MetricsErrorStateProps = {
  onRetry?: () => void;
};

export function MetricsAccessLoadingState() {
  return <LoadingState message="Validando acceso a métricas..." />;
}

export function MetricsLoadingState() {
  return (
    <div className="space-y-3" aria-label="Cargando métricas">
      <SkeletonCards count={6} />
    </div>
  );
}

export function LockedMetricsState() {
  const previewCurrency = getMetricsCurrency(LOCKED_METRICS_PREVIEW_DATA.meta);
  const previewGranularity = LOCKED_METRICS_PREVIEW_DATA.meta.granularity;

  return (
    <section className="relative overflow-hidden rounded-xl border border-neutral-dark bg-neutral-light shadow-sm">
      <div className="pointer-events-none select-none space-y-4 p-4 opacity-70 blur-[3px]" aria-hidden="true">
        <MetricsKpiGrid totals={LOCKED_METRICS_PREVIEW_DATA.totals} currency={previewCurrency} />
        <div className="grid gap-4 xl:grid-cols-2">
          <RevenueBookingsChart
            series={LOCKED_METRICS_PREVIEW_DATA.series}
            granularity={previewGranularity}
            currency={previewCurrency}
          />
          <OccupancyChart series={LOCKED_METRICS_PREVIEW_DATA.series} granularity={previewGranularity} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TopServicesCard services={LOCKED_METRICS_PREVIEW_DATA.topServices} currency={previewCurrency} />
          <TopClientsCard clients={LOCKED_METRICS_PREVIEW_DATA.topClients} currency={previewCurrency} />
          <TopResourcesCard resources={LOCKED_METRICS_PREVIEW_DATA.topResources} currency={previewCurrency} />
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-neutral-light/80 via-neutral-light/90 to-neutral-light" />

      <div className="absolute inset-0 flex items-start justify-center p-4 sm:items-center">
        <PageCard className="max-w-xl border-amber-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="inline-flex size-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700" aria-hidden="true">
              <Lock className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-primary-dark">Métricas avanzadas no disponibles</h2>
              <p className="mt-2 text-sm text-primary-light">
                Tu plan todavía no tiene habilitado el módulo de métricas. Activá la suscripción para analizar ingresos realizados,
                ocupación y rendimiento por filtros.
              </p>
              <p className="mt-2 text-xs text-primary-light">
                La vista de fondo es una muestra de referencia; no usa datos de tu negocio.
              </p>
              <a
                href="/configuracion?tab=subscription"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
              >
                Ver suscripción
              </a>
            </div>
          </div>
        </PageCard>
      </div>
    </section>
  );
}

export function MetricsEmptyState() {
  return (
    <EmptyState
      icon={CalendarX2}
      title="Sin métricas relevantes"
      description="No encontramos actividad completada, ingresos realizados u otros indicadores relevantes para los filtros seleccionados."
    />
  );
}

export function MetricsGenericErrorState({ onRetry }: MetricsErrorStateProps) {
  return (
    <ErrorState
      title="No pudimos cargar las métricas"
      message="Revisá los filtros o intentá de nuevo. Si el problema continúa, puede haber una respuesta inesperada del servicio de métricas."
      onRetry={onRetry}
    />
  );
}

export function MetricsCapabilityErrorState({ onRetry }: MetricsErrorStateProps) {
  return (
    <ErrorState
      title="No pudimos validar el acceso"
      message="No fue posible confirmar si el módulo de métricas está disponible para tu cuenta."
      onRetry={onRetry}
    />
  );
}

export function UnsupportedMetricsRoleState() {
  return <ErrorState title="Rol no soportado" message="Tu rol no tiene una vista de métricas disponible." />;
}

export function ResourceNotAssignedState() {
  return (
    <PageCard>
      <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700" aria-hidden="true">
          <UserRoundCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-primary-dark">Necesitás un recurso asignado</h2>
          <p className="mt-2 text-sm text-primary-light">
            Tu usuario profesional todavía no está vinculado a un recurso de agenda. Pedile a un administrador que te asigne
            como recurso para ver tus métricas personales.
          </p>
        </div>
      </div>
    </PageCard>
  );
}

export function OccupancyUnknownCallout({ unknownDays }: { unknownDays: number }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="status">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">Ocupación parcialmente no disponible</p>
        <p className="mt-1 text-sm">
          Hay {unknownDays} {unknownDays === 1 ? "día" : "días"} sin capacidad configurada. Esos buckets se muestran como
          no disponibles y no se convierten a 0%.
        </p>
      </div>
    </div>
  );
}

export function LiveTodayBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      Hoy en vivo
    </span>
  );
}
