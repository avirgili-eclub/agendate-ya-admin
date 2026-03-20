import { useQuery } from "@tanstack/react-query";

import { fetchDashboardSnapshot } from "@/features/dashboard/dashboard-service";

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard", "snapshot"],
    queryFn: fetchDashboardSnapshot,
    staleTime: 60_000,
  });
}
