import { Lock, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { getSessionState } from "@/core/auth/session-store";
import { MetricsFilters } from "@/features/metrics/components/metrics-filters";
import { MetricsKpiGrid } from "@/features/metrics/components/metrics-kpi-grid";
import { OccupancyChart } from "@/features/metrics/components/occupancy-chart";
import { RevenueBookingsChart } from "@/features/metrics/components/revenue-bookings-chart";
import { TopClientsCard } from "@/features/metrics/components/top-clients-card";
import { TopResourcesCard } from "@/features/metrics/components/top-resources-card";
import { TopServicesCard } from "@/features/metrics/components/top-services-card";
import {
  DEFAULT_METRICS_GRANULARITY,
  getMetricsCurrency,
} from "@/features/metrics/metrics-formatters";
import type { MetricsFilters as MetricsFiltersValue, ProfessionalMetricsData, TenantMetricsData } from "@/features/metrics/metrics-types";
import {
  isMetricsFeatureNotAvailableError,
  isMetricsResourceNotAssignedError,
  useProfessionalMetricsQuery,
  useTenantMetricsQuery,
} from "@/features/metrics/use-metrics-query";
import { canUseMetricsDashboard } from "@/features/tenant/tenant-capabilities-types";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState, SkeletonCards } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultFilters(): MetricsFiltersValue {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 29);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
    granularity: DEFAULT_METRICS_GRANULARITY,
    locationIds: [],
  };
}

function isAdminMetricsRole(role?: string) {
  const normalizedRole = role?.toUpperCase() ?? "";
  return normalizedRole === "TENANT_ADMIN" || normalizedRole === "LOCATION_MANAGER" || normalizedRole === "SUPER_ADMIN";
}

function isProfessionalRole(role?: string) {
  return role?.toUpperCase() === "PROFESSIONAL";
}

function hasMeaningfulMetrics(data: TenantMetricsData | ProfessionalMetricsData) {
  return (
    data.totals.bookingsCount > 0 ||
    data.totals.completedCount > 0 ||
    data.totals.revenueCompleted > 0 ||
    data.series.length > 0 ||
    data.topServices.length > 0 ||
    data.topClients.length > 0
  );
}

function LockedMetricsState() {
  return (
    <PageCard>
      <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700" aria-hidden="true">
          <Lock className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary-dark">Metricas avanzadas no disponibles</h2>
          <p className="mt-2 text-sm text-primary-light">
            El modulo de metricas requiere la capacidad METRICS_DASHBOARD. Actualiza el plan o solicita la activacion para ver ingresos realizados y ocupacion.
          </p>
          <a
            href="/configuracion?tab=subscription"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            Ver suscripcion
          </a>
        </div>
      </div>
    </PageCard>
  );
}

function ResourceNotAssignedState() {
  return (
    <ErrorState
      title="Perfil profesional sin recurso asignado"
      message="Tu usuario profesional necesita estar vinculado a un recurso para ver sus metricas personales. Pedile a un administrador que complete la asignacion."
    />
  );
}

function LiveTodayBadge({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      Hoy en vivo
    </span>
  );
}

function MetricsContent({ data, showTopResources }: { data: TenantMetricsData | ProfessionalMetricsData; showTopResources: boolean }) {
  const currency = getMetricsCurrency(data.meta);
  const granularity = data.meta.granularity;
  const liveToday = data.meta.includesToday && data.meta.todayIsLive;

  if (!hasMeaningfulMetrics(data)) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sin actividad completada"
        description="No hay reservas completadas ni ingresos realizados para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LiveTodayBadge show={liveToday} />
      </div>
      <MetricsKpiGrid totals={data.totals} currency={currency} />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueBookingsChart series={data.series} granularity={granularity} currency={currency} />
        <OccupancyChart series={data.series} granularity={granularity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TopServicesCard services={data.topServices} currency={currency} />
        <TopClientsCard clients={data.topClients} currency={currency} />
        {showTopResources && "topResources" in data && (
          <TopResourcesCard resources={data.topResources ?? []} currency={currency} />
        )}
      </div>
    </div>
  );
}

export function MetricsPage() {
  const session = getSessionState();
  const role = session.user?.role;
  const isProfessional = isProfessionalRole(role);
  const showTenantMetrics = isAdminMetricsRole(role);
  const [filters, setFilters] = useState<MetricsFiltersValue>(() => getDefaultFilters());
  const professionalFilters = useMemo(
    () => ({ from: filters.from, to: filters.to, granularity: filters.granularity }),
    [filters.from, filters.to, filters.granularity],
  );

  const capabilitiesQuery = useTenantCapabilitiesQuery();
  const canUseMetrics = canUseMetricsDashboard(capabilitiesQuery.data);
  const queryEnabled = Boolean(canUseMetrics && (isProfessional || showTenantMetrics));
  const tenantMetricsQuery = useTenantMetricsQuery(filters, {
    enabled: queryEnabled && showTenantMetrics,
  });
  const professionalMetricsQuery = useProfessionalMetricsQuery(professionalFilters, {
    enabled: queryEnabled && isProfessional,
  });
  const activeQuery = isProfessional ? professionalMetricsQuery : tenantMetricsQuery;

  if (capabilitiesQuery.isLoading) {
    return <LoadingState message="Validando acceso a metricas..." />;
  }

  if (capabilitiesQuery.isError) {
    return (
      <ErrorState
        message="No pudimos validar si el modulo de metricas esta disponible."
        onRetry={() => void capabilitiesQuery.refetch()}
      />
    );
  }

  if (!canUseMetrics) {
    return <LockedMetricsState />;
  }

  if (!isProfessional && !showTenantMetrics) {
    return <ErrorState title="Rol no soportado" message="Tu rol no tiene una vista de metricas disponible." />;
  }

  if (isMetricsFeatureNotAvailableError(activeQuery.error)) {
    return <LockedMetricsState />;
  }

  if (isMetricsResourceNotAssignedError(activeQuery.error)) {
    return <ResourceNotAssignedState />;
  }

  return (
    <div className="space-y-4">
      <MetricsFilters
        filters={filters}
        showLocationFilter={showTenantMetrics}
        onChange={(nextFilters) => {
          setFilters(isProfessional ? { ...nextFilters, locationIds: [] } : nextFilters);
        }}
      />

      {activeQuery.isLoading && <SkeletonCards count={6} />}

      {activeQuery.isError && !activeQuery.isLoading && (
        <ErrorState
          message="No pudimos cargar las metricas para los filtros seleccionados."
          onRetry={() => void activeQuery.refetch()}
        />
      )}

      {activeQuery.data && !activeQuery.isError && (
        <MetricsContent data={activeQuery.data} showTopResources={showTenantMetrics} />
      )}
    </div>
  );
}
