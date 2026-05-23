import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type {
  MetricsEnvelope,
  MetricsFilters,
  ProfessionalMetricsApiData,
  ProfessionalMetricsData,
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

export const metricsServiceInternals = {
  buildMetricsSearchParams,
};
