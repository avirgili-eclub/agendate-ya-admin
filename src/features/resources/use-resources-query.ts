import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchResources, type ResourceListParams, type ResourceListResult } from "@/features/resources/resources-service";

type UseResourcesQueryOptions = {
  enabled?: boolean;
};

export function useResourcesQuery(params: ResourceListParams, options: UseResourcesQueryOptions = {}) {
  return useQuery<ResourceListResult>({
    queryKey: ["resources", params],
    queryFn: () => fetchResources(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}
