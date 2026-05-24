import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchProfessionalMetrics,
  fetchProfessionalRevenueComparison,
  fetchTenantMetrics,
  fetchTenantRevenueComparison,
} from "@/features/metrics/metrics-service";
import type {
  MetricsFilters,
  ProfessionalMetricsData,
  RevenueComparisonQuery,
  RevenueComparisonResponse,
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

function stableRevenueComparisonQuery(query: RevenueComparisonQuery) {
  return {
    anchor: query.anchor,
    period: query.period,
    locationIds: [...(query.locationIds ?? [])].filter(Boolean).sort(),
  };
}

function stableProfessionalRevenueComparisonQuery(query: Omit<RevenueComparisonQuery, "locationIds">) {
  return {
    anchor: query.anchor,
    period: query.period,
  };
}

export const metricsQueryKeys = {
  all: ["metrics"] as const,
  tenant: (filters: MetricsFilters) =>
    [...metricsQueryKeys.all, "tenant", stableMetricsFilters(filters)] as const,
  professional: (filters: Omit<MetricsFilters, "locationIds">) =>
    [...metricsQueryKeys.all, "professional", stableProfessionalMetricsFilters(filters)] as const,
  tenantRevenueComparison: (query: RevenueComparisonQuery) =>
    [...metricsQueryKeys.all, "tenant", "revenue-comparison", stableRevenueComparisonQuery(query)] as const,
  professionalRevenueComparison: (query: Omit<RevenueComparisonQuery, "locationIds">) =>
    [
      ...metricsQueryKeys.all,
      "professional",
      "revenue-comparison",
      stableProfessionalRevenueComparisonQuery(query),
    ] as const,
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

export function useTenantRevenueComparisonQuery(
  query: RevenueComparisonQuery,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<RevenueComparisonResponse, AppError>({
    queryKey: metricsQueryKeys.tenantRevenueComparison(query),
    queryFn: () => fetchTenantRevenueComparison(query),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: options.staleTime ?? 60_000,
  });
}

export function useProfessionalRevenueComparisonQuery(
  query: Omit<RevenueComparisonQuery, "locationIds">,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<RevenueComparisonResponse, AppError>({
    queryKey: metricsQueryKeys.professionalRevenueComparison(query),
    queryFn: () => fetchProfessionalRevenueComparison(query),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: options.staleTime ?? 60_000,
  });
}
