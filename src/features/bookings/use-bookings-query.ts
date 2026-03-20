import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchBookings,
  fetchBookingById,
  type BookingListParams,
  type BookingListResult,
  type BookingDetail,
} from "@/features/bookings/bookings-service";

export function useBookingsQuery(params: BookingListParams) {
  return useQuery<BookingListResult>({
    queryKey: ["bookings", params],
    queryFn: () => fetchBookings(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useBookingDetailQuery(id: string | null) {
  return useQuery<BookingDetail>({
    queryKey: ["booking-detail", id],
    queryFn: () => fetchBookingById(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}
