import { useMemo, useState } from "react";
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, CalendarDays, Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { useBookingsQuery } from "@/features/bookings/use-bookings-query";
import {
  deleteBooking,
  getStatusLabel,
  getStatusTone,
  getSourceChannelLabel,
  getBookingErrorMessage,
  type BookingListItem,
  type SourceChannel,
} from "@/features/bookings/bookings-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { SidePanel } from "@/shared/ui/side-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { DataTable, DataTableSortButton, type DataTableColumn } from "@/shared/ui/data-table";
import { BookingCreateForm } from "@/features/bookings/components/booking-create-form";
import { BookingDetailPanel } from "@/features/bookings/components/booking-detail-panel";

function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

type BookingRowProps = {
  booking: BookingListItem;
  onViewDetail: (booking: BookingListItem) => void;
  onCancel: (booking: BookingListItem) => void;
};

type BookingSortKey =
  | "reservationCode"
  | "startTime"
  | "clientName"
  | "serviceName"
  | "resourceName"
  | "status";
type BookingSortDirection = "asc" | "desc";
type BookingStatusFilter = "ALL" | BookingListItem["status"];
type BookingChannelFilter = "ALL" | SourceChannel;

const BOOKING_STATUS_OPTIONS: BookingStatusFilter[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

const BOOKING_CHANNEL_OPTIONS: BookingChannelFilter[] = ["ALL", "WEB", "WHATSAPP", "API", "MCP", "ADMIN"];

function compareText(left: string, right: string) {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function BookingActions({ booking, onViewDetail, onCancel }: BookingRowProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onViewDetail(booking)}
        className="rounded-md p-1.5 text-primary-light transition-colors hover:bg-neutral-dark hover:text-primary"
        aria-label="Ver detalle"
      >
        <Eye className="size-4" />
      </button>
      {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
        <button
          onClick={() => onCancel(booking)}
          className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
          aria-label="Cancelar turno"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

function BookingMobileCard({ booking, onViewDetail, onCancel }: BookingRowProps) {
  return (
    <div className="rounded-xl border border-neutral-dark bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary-light">
            Cod. {booking.reservationCode || "Sin codigo"}
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">{booking.clientName}</p>
          <p className="mt-1 text-xs text-primary-light">{booking.clientPhone || "Sin teléfono"}</p>
        </div>
        <StatusChip tone={getStatusTone(booking.status)} label={getStatusLabel(booking.status)} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-primary-light">
        <p><span className="font-medium text-primary">Servicio:</span> {booking.serviceName}</p>
        <p><span className="font-medium text-primary">Recurso:</span> {booking.resourceName}</p>
        <p><span className="font-medium text-primary">Fecha:</span> {formatDateTime(booking.startTime)}</p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-dark pt-3">
        <Button variant="outline" size="sm" onClick={() => onViewDetail(booking)}>
          <Eye className="mr-2 size-4" />
          Ver detalle
        </Button>
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50" onClick={() => onCancel(booking)}>
            <Trash2 className="mr-2 size-4" />
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}


export function BookingsPage() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("booking");
  const [bookingPendingCancel, setBookingPendingCancel] = useState<BookingListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<BookingChannelFilter>("ALL");
  const [sortKey, setSortKey] = useState<BookingSortKey>("startTime");
  const [sortDirection, setSortDirection] = useState<BookingSortDirection>("desc");

  const bookingsQuery = useBookingsQuery({ page, pageSize });
  const queryClient = useQueryClient();

  const cancelBookingMutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      showFeedback("success", "Turno cancelado correctamente.");
      setBookingPendingCancel(null);
    },
    onError: (error: AppError) => {
      showFeedback("error", getBookingErrorMessage(error));
      setBookingPendingCancel(null);
    },
  });

  const data = bookingsQuery.data?.data ?? [];
  const total = bookingsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const visibleBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = data.filter((booking) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          booking.clientName,
          booking.clientPhone,
          booking.reservationCode,
          booking.serviceName,
          booking.resourceName,
          getSourceChannelLabel(booking.sourceChannel),
          getStatusLabel(booking.status),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus = statusFilter === "ALL" || booking.status === statusFilter;
      const matchesChannel = channelFilter === "ALL" || booking.sourceChannel === channelFilter;

      return matchesSearch && matchesStatus && matchesChannel;
    });

    const sorted = [...filtered].sort((left, right) => {
      let comparison = 0;

      switch (sortKey) {
        case "reservationCode":
          comparison = compareText(left.reservationCode, right.reservationCode);
          break;
        case "startTime":
          comparison = new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
          break;
        case "clientName":
          comparison = compareText(left.clientName, right.clientName);
          break;
        case "serviceName":
          comparison = compareText(left.serviceName, right.serviceName);
          break;
        case "resourceName":
          comparison = compareText(left.resourceName, right.resourceName);
          break;
        case "status":
          comparison = compareText(getStatusLabel(left.status), getStatusLabel(right.status));
          break;
      }

      return sortDirection === "asc" ? comparison : comparison * -1;
    });

    return sorted;
  }, [channelFilter, data, searchTerm, sortDirection, sortKey, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilter !== "ALL" || channelFilter !== "ALL";
  const hasAdjustedView = hasActiveFilters || sortKey !== "startTime" || sortDirection !== "desc";

  function handleCancelBooking(booking: BookingListItem) {
    setBookingPendingCancel(booking);
  }

  function handleOpenDetail(booking: BookingListItem) {
    setSelectedBooking(booking);
  }

  function toggleSort(nextKey: BookingSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "startTime" ? "desc" : "asc");
  }

  const columns: DataTableColumn<BookingListItem>[] = [
    {
      id: "reservation-code",
      header: (
        <DataTableSortButton
          label="Cod"
          direction={sortKey === "reservationCode" ? sortDirection : null}
          onClick={() => toggleSort("reservationCode")}
        />
      ),
      cell: (booking) => (
        <span className="font-semibold uppercase text-primary">
          {booking.reservationCode || "Sin codigo"}
        </span>
      ),
      className: "w-[96px]",
      headerClassName: "w-[96px]",
    },
    {
      id: "client",
      header: (
        <DataTableSortButton
          label="Cliente"
          direction={sortKey === "clientName" ? sortDirection : null}
          onClick={() => toggleSort("clientName")}
        />
      ),
      cell: (booking) => <span className="font-medium text-primary">{booking.clientName}</span>,
    },
    {
      id: "phone",
      header: "Teléfono",
      cell: (booking) => booking.clientPhone || "Sin teléfono",
    },
    {
      id: "service",
      header: (
        <DataTableSortButton
          label="Servicio"
          direction={sortKey === "serviceName" ? sortDirection : null}
          onClick={() => toggleSort("serviceName")}
        />
      ),
      cell: (booking) => booking.serviceName,
    },
    {
      id: "resource",
      header: (
        <DataTableSortButton
          label="Recurso"
          direction={sortKey === "resourceName" ? sortDirection : null}
          onClick={() => toggleSort("resourceName")}
        />
      ),
      cell: (booking) => booking.resourceName,
    },
    {
      id: "date",
      header: (
        <DataTableSortButton
          label="Fecha y Hora"
          direction={sortKey === "startTime" ? sortDirection : null}
          onClick={() => toggleSort("startTime")}
        />
      ),
      cell: (booking) => formatDateTime(booking.startTime),
    },
    {
      id: "status",
      header: (
        <DataTableSortButton
          label="Estado"
          direction={sortKey === "status" ? sortDirection : null}
          onClick={() => toggleSort("status")}
        />
      ),
      cell: (booking) => (
        <StatusChip tone={getStatusTone(booking.status)} label={getStatusLabel(booking.status)} />
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: (booking) => (
        <BookingActions
          booking={booking}
          onViewDetail={handleOpenDetail}
          onCancel={handleCancelBooking}
        />
      ),
      className: "w-[120px]",
      headerClassName: "w-[120px]",
    },
  ];

  return (
    <div className="space-y-6">
      {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

      <PageCard>
        {bookingsQuery.isLoading && <LoadingState message="Cargando turnos..." />}

        {bookingsQuery.isError && (
          <ErrorState
            title="Error al cargar turnos"
            message="No pudimos cargar la lista de reservas. Intenta nuevamente."
            onRetry={() => void bookingsQuery.refetch()}
          />
        )}

        {bookingsQuery.isSuccess && (
          <>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-xl lg:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar codigo, cliente, servicio, recurso o telefono..."
                    className="h-11 w-full rounded-md border border-neutral-dark bg-white pl-10 pr-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
                  />
                </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:ml-auto lg:w-auto lg:items-center">
                {data.length > 0 && (
                  <>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookingStatusFilter)}>
                      <SelectTrigger className="w-full sm:w-[190px]">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === "ALL" ? "Todos los estados" : getStatusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as BookingChannelFilter)}>
                      <SelectTrigger className="w-full sm:w-[190px]">
                        <SelectValue placeholder="Filtrar por canal" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === "ALL" ? "Todos los canales" : getSourceChannelLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

                <Button onClick={() => setShowCreateForm(true)} className="w-full justify-center sm:w-auto lg:shrink-0">
                  <Plus className="mr-2 size-4" />
                  Nuevo Turno
                </Button>
              </div>
            </div>

            {data.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin turnos"
                description="No hay turnos registrados. Crea el primero para comenzar."
              />
            ) : (
              <>
                <DataTable
                  data={visibleBookings}
                  columns={columns}
                  rowKey={(booking) => booking.id}
                  mobileRow={(booking) => (
                    <BookingMobileCard
                      booking={booking}
                      onViewDetail={handleOpenDetail}
                      onCancel={handleCancelBooking}
                    />
                  )}
                  emptyState={
                    <EmptyState
                      icon={CalendarDays}
                      title="Sin resultados en esta página"
                      description={
                        hasActiveFilters
                          ? "No encontramos turnos que coincidan con los filtros aplicados en la página actual."
                          : "No hay turnos para mostrar."
                      }
                    />
                  }
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-neutral-dark pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-primary-light">
                        Mostrando {visibleBookings.length} de {data.length} de {total} total de turnos
                      </p>
                      {hasAdjustedView && (
                        <p className="mt-1 text-xs text-primary-light">
                          Vista ajustada sobre los {data.length} turnos cargados
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <span className="text-sm text-primary" aria-current="page">
                        Página {page + 1} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageCard>

      {/* Create Form Side Panel */}
      <SidePanel
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Nuevo Turno"
      >
        <BookingCreateForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            showFeedback("success", "Turno creado correctamente.");
          }}
        />
      </SidePanel>

      {/* Detail Side Panel */}
      <SidePanel
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Detalle del Turno"
      >
        {selectedBooking && (
          <BookingDetailPanel
            bookingId={selectedBooking.id}
            bookingSummary={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ["bookings"] });
            }}
          />
        )}
      </SidePanel>

      <ConfirmDialog
        isOpen={Boolean(bookingPendingCancel)}
        title="Confirmar cancelación"
        message="¿Confirmas la cancelación de este turno?"
        confirmLabel="Sí, confirmar"
        cancelLabel="No, volver"
        pendingLabel="Cancelando..."
        isPending={cancelBookingMutation.isPending}
        tone="danger"
        onClose={() => setBookingPendingCancel(null)}
        onConfirm={() => {
          if (!bookingPendingCancel) {
            return;
          }
          cancelBookingMutation.mutate(bookingPendingCancel.id);
        }}
      />
    </div>
  );
}
