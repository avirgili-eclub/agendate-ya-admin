import { useQuery } from "@tanstack/react-query";

import { fetchTenantCapabilities } from "@/features/tenant/tenant-capabilities-service";

export function useTenantCapabilitiesQuery() {
  return useQuery({
    queryKey: ["tenant-capabilities"],
    queryFn: fetchTenantCapabilities,
    staleTime: 5 * 60_000,
  });
}
