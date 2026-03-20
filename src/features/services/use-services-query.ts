import { useQuery } from "@tanstack/react-query";
import { fetchServices } from "@/features/services/services-service";

export function useServicesQuery() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
    staleTime: 30_000,
  });
}
