import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchResources, type ResourceListParams, type ResourceListResult } from "@/features/resources/resources-service";

export function useResourcesQuery(params: ResourceListParams) {
  return useQuery<ResourceListResult>({
    queryKey: ["resources", params],
    queryFn: () => fetchResources(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
