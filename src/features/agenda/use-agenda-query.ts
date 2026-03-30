import { useQuery } from "@tanstack/react-query";
import {
  fetchBookings,
  fetchLocations,
  fetchLocationResources,
  fetchCalendarBookings,
  type BookingListParams,
  type CalendarBookingsParams,
} from "@/features/agenda/agenda-service";

export function useBookingsQuery(params: BookingListParams) {
  return useQuery({
    queryKey: ["bookings", "list", params],
    queryFn: () => fetchBookings(params),
    staleTime: 30_000,
  });
}

export function useCalendarBookingsQuery(params: CalendarBookingsParams) {
  return useQuery({
    queryKey: ["bookings", "calendar", params],
    queryFn: () => fetchCalendarBookings(params),
    enabled: params.resourceIds.length > 0,
    staleTime: 30_000,
  });
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["agenda", "locations"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });
}

export function useLocationResourcesQuery(locationId: string | null) {
  return useQuery({
    queryKey: ["agenda", "resources", locationId],
    queryFn: () => (locationId ? fetchLocationResources(locationId) : Promise.resolve([])),
    enabled: !!locationId,
    staleTime: 60_000,
  });
}
