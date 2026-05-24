import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type {
  MetricsEnvelope,
  MetricsFilters,
  ProfessionalMetricsApiData,
  ProfessionalMetricsData,
  RevenueComparisonQuery,
  RevenueComparisonResponse,
  TenantMetricsData,
} from "@/features/metrics/metrics-types";

function buildMetricsSearchParams(filters: MetricsFilters): string {
  const searchParams = new URLSearchParams();

  searchParams.set("from", filters.from);
  searchParams.set("to", filters.to);

  if (filters.granularity) {
    searchParams.set("granularity", filters.granularity);
  }

  for (const locationId of filters.locationIds ?? []) {
    if (locationId.trim()) {
      searchParams.append("locationIds", locationId);
    }
  }

  return searchParams.toString();
}

function buildRevenueComparisonSearchParams(query: RevenueComparisonQuery): string {
  const searchParams = new URLSearchParams();

  searchParams.set("anchor", query.anchor);
  searchParams.set("period", query.period);

  for (const locationId of query.locationIds ?? []) {
    if (locationId.trim()) {
      searchParams.append("locationIds", locationId);
    }
  }

  return searchParams.toString();
}

export async function fetchTenantMetrics(filters: MetricsFilters): Promise<TenantMetricsData> {
  const query = buildMetricsSearchParams(filters);
  const response = await httpRequest<MetricsEnvelope<TenantMetricsData>>(
    `/metrics/tenant?${query}`,
  );

  return unwrapData<TenantMetricsData>(response);
}

export async function fetchProfessionalMetrics(
  filters: Omit<MetricsFilters, "locationIds">,
): Promise<ProfessionalMetricsData> {
  const query = buildMetricsSearchParams(filters);
  const response = await httpRequest<MetricsEnvelope<ProfessionalMetricsApiData>>(
    `/metrics/professional/me?${query}`,
  );
  const { topResources: _topResources, ...data } = unwrapData<ProfessionalMetricsApiData>(
    response,
  );

  return data;
}

export async function fetchTenantRevenueComparison(
  query: RevenueComparisonQuery,
): Promise<RevenueComparisonResponse> {
  const search = buildRevenueComparisonSearchParams(query);
  const response = await httpRequest<MetricsEnvelope<RevenueComparisonResponse>>(
    `/metrics/tenant/revenue-comparison?${search}`,
  );

  return unwrapData<RevenueComparisonResponse>(response);
}

export async function fetchProfessionalRevenueComparison(
  query: Omit<RevenueComparisonQuery, "locationIds">,
): Promise<RevenueComparisonResponse> {
  const search = buildRevenueComparisonSearchParams(query);
  const response = await httpRequest<MetricsEnvelope<RevenueComparisonResponse>>(
    `/metrics/professional/me/revenue-comparison?${search}`,
  );

  return unwrapData<RevenueComparisonResponse>(response);
}

export const metricsServiceInternals = {
  buildMetricsSearchParams,
  buildRevenueComparisonSearchParams,
};
