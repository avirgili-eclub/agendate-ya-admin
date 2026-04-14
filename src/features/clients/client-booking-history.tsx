import { useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Calendar, Loader2 } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchClientBookingHistory,
  type ClientBookingHistoryItem,
} from "@/features/clients/clients-service";
import { StatusChip } from "@/shared/ui/status-chip";

type ClientBookingHistoryProps = {
  clientId: string;
  isActive: boolean;
};

const PAGE_SIZE = 8;

function getStatusTone(status: string): "success" | "warning" | "neutral" | "danger" {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === "confirmed" || lowerStatus === "completed") return "success";
  if (lowerStatus === "pending") return "warning";
  if (lowerStatus === "cancelled" || lowerStatus === "no_show") return "danger";
  return "neutral";
}

function formatBookingDateTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  return `${date.toLocaleDateString("es-PY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} ${date.toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function flattenBookings(pages: Array<{ bookings: ClientBookingHistoryItem[] }> | undefined) {
  if (!pages) {
    return [];
  }

  return pages.flatMap((page) => page.bookings);
}

export function ClientBookingHistory({ clientId, isActive }: ClientBookingHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["client-bookings-history", clientId],
    queryFn: ({ pageParam }) =>
      fetchClientBookingHistory(clientId, {
        page: pageParam,
        size: PAGE_SIZE,
      }),
    initialPageParam: 0,
    enabled: isActive,
    staleTime: 60_000,
    refetchOnMount: false,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) {
        return undefined;
      }
      return lastPage.page + 1;
    },
  });

  const bookings = useMemo(() => flattenBookings(data?.pages), [data?.pages]);

  const handleScroll = () => {
    if (!containerRef.current || isFetchingNextPage || !hasNextPage) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 120;
    if (isNearBottom) {
      void fetchNextPage();
    }
  };

  if (isPending) {
    return (
      <div className="rounded-lg bg-neutral p-8 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-primary-light">
          <Loader2 className="size-4 animate-spin" />
          Cargando historial de turnos...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p className="font-semibold">No se pudo obtener el historial del cliente en este momento.</p>
        <p className="mt-1 text-red-600">
          Si el problema persiste, contacta con el administrador del sitio.
        </p>
        <p className="mt-2 text-xs text-red-500">
          {(error as unknown as AppError)?.message ?? "Error de conexión con el servicio."}
        </p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg bg-neutral p-8 text-center">
        <Calendar className="mx-auto size-8 text-neutral-dark" />
        <p className="mt-3 text-sm text-primary-light">
          Este cliente aún no tiene turnos completados.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="max-h-[420px] space-y-3 overflow-y-auto pr-1 scroll-smooth"
    >
      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="rounded-lg border border-neutral-dark bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-primary">{booking.serviceName}</p>
              {booking.resourceName && (
                <p className="mt-1 text-xs text-primary-light">Con: {booking.resourceName}</p>
              )}
              {booking.locationName && (
                <p className="mt-1 text-xs text-primary-light">Lugar: {booking.locationName}</p>
              )}
              <p className="mt-2 text-xs text-primary-light">{formatBookingDateTime(booking.scheduledAt)}</p>
            </div>
            <StatusChip label={booking.status} tone={getStatusTone(booking.status)} />
          </div>
        </article>
      ))}

      {isFetchingNextPage && (
        <div className="pb-2 text-center text-xs text-primary-light">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral px-3 py-1">
            <Loader2 className="size-3 animate-spin" />
            Cargando turnos anteriores...
          </span>
        </div>
      )}

      {!hasNextPage && (
        <p className="pb-2 text-center text-xs text-primary-light">
          Llegaste al inicio del historial.
        </p>
      )}
    </div>
  );
}
