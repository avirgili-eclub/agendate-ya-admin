import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import {
  fetchUpcomingBookingsPage,
  type UpcomingBooking,
} from "@/features/dashboard/dashboard-service";

const DEFAULT_PAGE_SIZE = 20;

function flattenBookings(
  pages: Array<{ bookings: UpcomingBooking[] }> | undefined,
): UpcomingBooking[] {
  if (!pages) {
    return [];
  }

  return pages.flatMap((page) => page.bookings);
}

export function useDashboardUpcomingBookingsQuery(pageSize: number = DEFAULT_PAGE_SIZE) {
  const query = useInfiniteQuery({
    queryKey: ["dashboard", "upcoming-bookings", pageSize],
    queryFn: ({ pageParam }) =>
      fetchUpcomingBookingsPage({
        page: pageParam,
        size: pageSize,
      }),
    initialPageParam: 0,
    staleTime: 60_000,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) {
        return undefined;
      }

      return lastPage.page + 1;
    },
  });

  const bookings = useMemo(() => flattenBookings(query.data?.pages), [query.data?.pages]);

  return {
    ...query,
    bookings,
  };
}
