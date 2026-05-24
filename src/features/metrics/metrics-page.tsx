import { useEffect, useMemo, useState } from "react";

import { getSessionState } from "@/core/auth/session-store";
import { MetricsFilters } from "@/features/metrics/components/metrics-filters";
import { MetricsKpiGrid } from "@/features/metrics/components/metrics-kpi-grid";
import { OccupancyChart } from "@/features/metrics/components/occupancy-chart";
import { RevenueBookingsChart } from "@/features/metrics/components/revenue-bookings-chart";
import {
  LiveTodayBadge,
  LockedMetricsState,
  MetricsAccessLoadingState,
  MetricsCapabilityErrorState,
  MetricsEmptyState,
  MetricsGenericErrorState,
  MetricsLoadingState,
  OccupancyUnknownCallout,
  ResourceNotAssignedState,
  UnsupportedMetricsRoleState,
} from "@/features/metrics/components/metrics-states";
import { TopClientsCard } from "@/features/metrics/components/top-clients-card";
import { TopResourcesCard } from "@/features/metrics/components/top-resources-card";
import { TopServicesCard } from "@/features/metrics/components/top-services-card";
import { getMetricsCurrency } from "@/features/metrics/metrics-formatters";
import type { MetricsFilters as MetricsFiltersValue, ProfessionalMetricsData, TenantMetricsData } from "@/features/metrics/metrics-types";
import {
  isMetricsFeatureNotAvailableError,
  isMetricsResourceNotAssignedError,
  useProfessionalMetricsQuery,
  useTenantMetricsQuery,
} from "@/features/metrics/use-metrics-query";
import { canUseMetricsDashboard } from "@/features/tenant/tenant-capabilities-types";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultFilters(): MetricsFiltersValue {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
    granularity: "week",
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

function MetricsContent({ data, showTopResources }: { data: TenantMetricsData | ProfessionalMetricsData; showTopResources: boolean }) {
  const currency = getMetricsCurrency(data.meta);
  const granularity = data.meta.granularity;
  const liveToday = data.meta.includesToday && data.meta.todayIsLive;
  const hasNullOccupancy =
    data.totals.daysWithNullCapacity > 0 ||
    data.series.some((bucket) => bucket.occupancyRate === null || bucket.capacityMinutes === null);
  const unknownOccupancyDays =
    data.totals.daysWithNullCapacity > 0
      ? data.totals.daysWithNullCapacity
      : data.series.filter((bucket) => bucket.occupancyRate === null || bucket.capacityMinutes === null).length;
  const [isOccupancyCalloutDismissed, setIsOccupancyCalloutDismissed] = useState(false);

  useEffect(() => {
    setIsOccupancyCalloutDismissed(false);
  }, [data.meta.from, data.meta.to, data.meta.granularity, unknownOccupancyDays, hasNullOccupancy]);

  if (!hasMeaningfulMetrics(data)) {
    return <MetricsEmptyState />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {liveToday && <LiveTodayBadge />}
      </div>
      {hasNullOccupancy && !isOccupancyCalloutDismissed && (
        <OccupancyUnknownCallout
          unknownDays={unknownOccupancyDays}
          onClose={() => setIsOccupancyCalloutDismissed(true)}
        />
      )}
      <MetricsKpiGrid totals={data.totals} currency={currency} />
      <div className="grid gap-3 xl:grid-cols-2">
        <RevenueBookingsChart series={data.series} granularity={granularity} currency={currency} />
        <OccupancyChart series={data.series} granularity={granularity} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
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
  const [defaultFilters] = useState<MetricsFiltersValue>(() => getDefaultFilters());
  const [filters, setFilters] = useState<MetricsFiltersValue>(() => defaultFilters);
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
    return <MetricsAccessLoadingState />;
  }

  if (capabilitiesQuery.isError) {
    return <MetricsCapabilityErrorState onRetry={() => void capabilitiesQuery.refetch()} />;
  }

  if (!canUseMetrics) {
    return <LockedMetricsState />;
  }

  if (!isProfessional && !showTenantMetrics) {
    return <UnsupportedMetricsRoleState />;
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
        defaultFilters={defaultFilters}
        showLocationFilter={showTenantMetrics}
        onApply={(nextFilters) => {
          setFilters(isProfessional ? { ...nextFilters, locationIds: [] } : nextFilters);
        }}
      />

      {activeQuery.isLoading && <MetricsLoadingState />}

      {activeQuery.isError && !activeQuery.isLoading && (
        <MetricsGenericErrorState onRetry={() => void activeQuery.refetch()} />
      )}

      {activeQuery.data && !activeQuery.isError && (
        <MetricsContent data={activeQuery.data} showTopResources={showTenantMetrics} />
      )}
    </div>
  );
}
