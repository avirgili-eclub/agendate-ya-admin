import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { fetchProfessionalMetrics, fetchTenantMetrics } from "@/features/metrics/metrics-service";
import type {
  MetricsFilters,
  ProfessionalMetricsData,
  TenantMetricsData,
} from "@/features/metrics/metrics-types";

function stableMetricsFilters(filters: MetricsFilters) {
  return {
    from: filters.from,
    to: filters.to,
    granularity: filters.granularity ?? "day",
    locationIds: [...(filters.locationIds ?? [])].filter(Boolean).sort(),
  };
}

function stableProfessionalMetricsFilters(filters: Omit<MetricsFilters, "locationIds">) {
  return {
    from: filters.from,
    to: filters.to,
    granularity: filters.granularity ?? "day",
  };
}

export const metricsQueryKeys = {
  all: ["metrics"] as const,
  tenant: (filters: MetricsFilters) =>
    [...metricsQueryKeys.all, "tenant", stableMetricsFilters(filters)] as const,
  professional: (filters: Omit<MetricsFilters, "locationIds">) =>
    [...metricsQueryKeys.all, "professional", stableProfessionalMetricsFilters(filters)] as const,
};

export function isMetricsFeatureNotAvailableError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "code" in error &&
    (error as AppError).status === 402 &&
    (error as AppError).code === "FEATURE_NOT_AVAILABLE"
  );
}

export function isMetricsResourceNotAssignedError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as AppError).code === "RESOURCE_NOT_ASSIGNED"
  );
}

export function useTenantMetricsQuery(
  filters: MetricsFilters,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<TenantMetricsData, AppError>({
    queryKey: metricsQueryKeys.tenant(filters),
    queryFn: () => fetchTenantMetrics(filters),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: options.staleTime ?? 60_000,
  });
}

export function useProfessionalMetricsQuery(
  filters: Omit<MetricsFilters, "locationIds">,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ProfessionalMetricsData, AppError>({
    queryKey: metricsQueryKeys.professional(filters),
    queryFn: () => fetchProfessionalMetrics(filters),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: options.staleTime ?? 60_000,
  });
}
