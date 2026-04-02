import { useState, type FormEvent } from "react";
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";

import type { AppError } from "@/core/errors/app-error";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";
import { useBookingsQuery, useBookingDetailQuery } from "@/features/bookings/use-bookings-query";
import {
  createBooking,
  fetchBookingServicesCatalog,
  deleteBooking,
  updateBookingStatus,
  getStatusLabel,
  getStatusTone,
  getSourceChannelLabel,
  getValidStatusTransitions,
  getBookingErrorMessage,
  type BookingListItem,
  type BookingStatus,
  type CreateBookingInput,
} from "@/features/bookings/bookings-service";
import {
  fetchLocations,
  fetchLocationResources,
} from "@/features/agenda/agenda-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { SidePanel } from "@/shared/ui/side-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

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

function BookingRow({ booking, onViewDetail, onCancel }: BookingRowProps) {
  return (
    <tr className="border-b border-neutral-dark hover:bg-neutral transition-colors">
      <td className="px-4 py-3 text-sm text-primary">{booking.clientName}</td>
      <td className="px-4 py-3 text-sm text-primary-light">{booking.clientPhone}</td>
      <td className="px-4 py-3 text-sm text-primary-light">{booking.serviceName}</td>
      <td className="px-4 py-3 text-sm text-primary-light">{booking.resourceName}</td>
      <td className="px-4 py-3 text-sm text-primary-light">
        {formatDateTime(booking.startTime)}
      </td>
      <td className="px-4 py-3">
        <StatusChip tone={getStatusTone(booking.status)} label={getStatusLabel(booking.status)} />
      </td>
      <td className="px-4 py-3 text-sm text-primary-light">
        {getSourceChannelLabel(booking.sourceChannel)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetail(booking)}
            className="rounded-md p-1.5 text-primary-light hover:bg-neutral-dark hover:text-primary transition-colors"
            aria-label="Ver detalle"
          >
            <Eye className="size-4" />
          </button>
          {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
            <button
              onClick={() => onCancel(booking)}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Cancelar turno"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

type CreateBookingFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateBookingForm({ onClose, onSuccess }: CreateBookingFormProps) {
  const queryClient = useQueryClient();

  const [locationId, setLocationId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+595");
  const [clientEmail, setClientEmail] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });

  const resourcesQuery = useQuery({
    queryKey: ["location-resources", locationId],
    queryFn: () => fetchLocationResources(locationId),
    enabled: !!locationId,
    staleTime: 60_000,
  });

  const servicesQuery = useQuery({
    queryKey: ["bookings", "services"],
    queryFn: fetchBookingServicesCatalog,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onSuccess();
      onClose();
    },
    onError: (error: AppError) => {
      // Use shared extractFieldErrors utility for DRY field error mapping
      setFieldErrors(extractFieldErrors(error));
      setFormError(getBookingErrorMessage(error));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validationErrors: Record<string, string> = {};
    if (!locationId) {
      validationErrors.locationId = "Debes seleccionar un local.";
    }
    if (!clientPhone || clientPhone === "+595" || !isValidPhoneNumber(clientPhone)) {
      validationErrors.clientPhone = "Ingresa un telefono valido.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    createMutation.mutate({
      resourceId,
      serviceId,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      date,
      startTime,
      notes: notes || undefined,
    });
  }

  const locations = locationsQuery.data?.filter((l) => l.active) ?? [];
  const resources = resourcesQuery.data?.filter((r) => r.active) ?? [];
  const services = servicesQuery.data?.filter((s) => s.active) ?? [];

  return (
    <form className="space-y-4 px-6 py-4" onSubmit={handleSubmit}>
      {formError && (
        <FeedbackBanner tone="error" message={formError} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Nombre del cliente *</span>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="Juan Pérez"
          />
          {fieldErrors.clientName && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientName}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Teléfono *</span>
          <div className={`register-phone-wrapper ${fieldErrors.clientPhone ? "!border-red-500" : ""}`}>
            <PhoneInput
              defaultCountry="py"
              preferredCountries={["py", "ar", "br", "cl", "uy"]}
              disableDialCodeAndPrefix
              showDisabledDialCodeAndPrefix
              defaultMask="(...) ... - ..."
              placeholder="(981) 123 - 456"
              value={clientPhone}
              onChange={(phone) => setClientPhone(phone)}
              className="register-phone-root"
              inputClassName="register-phone-input"
              inputProps={{
                name: "clientPhone",
                autoComplete: "tel",
              }}
              countrySelectorStyleProps={{
                buttonClassName: "register-phone-country-button",
                flagClassName: "register-phone-flag",
                dropdownArrowClassName: "register-phone-country-arrow",
                dropdownStyleProps: {
                  className: "register-phone-country-dropdown",
                  listItemClassName: "register-phone-country-item",
                  listItemSelectedClassName: "register-phone-country-item-selected",
                  listItemFocusedClassName: "register-phone-country-item-focused",
                },
              }}
            />
          </div>
          {fieldErrors.clientPhone && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientPhone}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Email (opcional)</span>
        <input
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="cliente@ejemplo.com"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Local *</span>
          <Select value={locationId} onValueChange={(value) => {
            setLocationId(value);
            setResourceId(""); // Reset resource when location changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.locationId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.locationId}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Recurso *</span>
          <Select value={resourceId} onValueChange={setResourceId} disabled={!locationId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar recurso" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.resourceId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.resourceId}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Servicio *</span>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar servicio" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.serviceId && (
          <span className="mt-1 block text-xs text-red-700">{fieldErrors.serviceId}</span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.date && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.date}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Hora de inicio *</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.startTime && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.startTime}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Información adicional sobre el turno"
        />
      </label>

      <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear turno"}
        </Button>
      </div>
    </form>
  );
}

type BookingDetailPanelProps = {
  bookingId: string;
  bookingSummary?: BookingListItem;
  onClose: () => void;
  onRefresh: () => void;
  onFeedback: (feedback: { tone: "success" | "error"; message: string }) => void;
};

function BookingDetailPanel({ bookingId, bookingSummary, onClose, onRefresh, onFeedback }: BookingDetailPanelProps) {
  const queryClient = useQueryClient();
  const detailQuery = useBookingDetailQuery(bookingId);
  const [confirmingAction, setConfirmingAction] = useState<{ action: "cancel" | "status"; newStatus?: BookingStatus } | null>(null);

  const pickPreferredText = (
    primary: string | undefined,
    secondary: string | undefined,
    placeholder?: string,
  ) => {
    const primaryTrimmed = primary?.trim();
    if (primaryTrimmed && (!placeholder || primaryTrimmed !== placeholder)) {
      return primaryTrimmed;
    }

    const secondaryTrimmed = secondary?.trim();
    if (secondaryTrimmed && (!placeholder || secondaryTrimmed !== placeholder)) {
      return secondaryTrimmed;
    }

    return primaryTrimmed || secondaryTrimmed || placeholder || "";
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-detail", bookingId] });
      onRefresh();
      onFeedback({ tone: "success", message: "Estado del turno actualizado correctamente." });
      setConfirmingAction(null);
    },
    onError: (error: AppError) => {
      onFeedback({ tone: "error", message: getBookingErrorMessage(error) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onRefresh();
      onFeedback({ tone: "success", message: "Turno cancelado correctamente." });
      onClose();
    },
    onError: (error: AppError) => {
      onFeedback({ tone: "error", message: getBookingErrorMessage(error) });
    },
  });

  if (detailQuery.isLoading && !bookingSummary) {
    return (
      <div className="px-6 py-8 text-center text-sm text-primary-light">
        Cargando detalles del turno...
      </div>
    );
  }

  const booking = detailQuery.data ?? bookingSummary;

  if (!booking) {
    return (
      <div className="px-6 py-8 text-center text-sm text-red-600">
        Error al cargar el turno. Intenta nuevamente.
      </div>
    );
  }

  const clientName = pickPreferredText(
    detailQuery.data?.clientName,
    bookingSummary?.clientName,
    "Cliente",
  );
  const clientPhone = pickPreferredText(detailQuery.data?.clientPhone, bookingSummary?.clientPhone);
  const serviceName = pickPreferredText(
    detailQuery.data?.serviceName,
    bookingSummary?.serviceName,
    "Servicio",
  );
  const resourceName = pickPreferredText(
    detailQuery.data?.resourceName,
    bookingSummary?.resourceName,
    "Sin asignar",
  );
  const notes = detailQuery.data?.notes ?? bookingSummary?.notes;
  const validTransitions = getValidStatusTransitions(booking.status);

  function handleStatusChange(newStatus: BookingStatus) {
    setConfirmingAction({ action: "status", newStatus });
  }

  function handleCancelBooking() {
    setConfirmingAction({ action: "cancel" });
  }

  function executeAction() {
    if (!confirmingAction) return;

    if (confirmingAction.action === "cancel") {
      cancelMutation.mutate(bookingId);
    } else if (confirmingAction.action === "status" && confirmingAction.newStatus) {
      statusMutation.mutate({ id: bookingId, status: confirmingAction.newStatus });
    }
  }

  return (
    <div className="px-6 py-4">
      {detailQuery.isError && bookingSummary && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No se pudieron cargar todos los detalles del turno. Mostrando datos disponibles del listado.
        </div>
      )}

      <div className="space-y-6">
        {/* Client Info */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-primary">Cliente</h3>
          <div className="space-y-2 rounded-md bg-neutral p-4">
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Nombre:</span>
              <span className="text-sm font-medium text-primary">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Teléfono:</span>
              <span className="text-sm font-medium text-primary">{clientPhone}</span>
            </div>
          </div>
        </section>

        {/* Booking Details */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-primary">Detalles del Turno</h3>
          <div className="space-y-2 rounded-md bg-neutral p-4">
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Servicio:</span>
              <span className="text-sm font-medium text-primary">{serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Recurso:</span>
              <span className="text-sm font-medium text-primary">{resourceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Inicio:</span>
              <span className="text-sm font-medium text-primary">
                {formatDateTime(booking.startTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Fin:</span>
              <span className="text-sm font-medium text-primary">
                {formatTime(booking.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Estado:</span>
              <StatusChip
                tone={getStatusTone(booking.status)}
                label={getStatusLabel(booking.status)}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Canal:</span>
              <span className="text-sm font-medium text-primary">
                {getSourceChannelLabel(booking.sourceChannel)}
              </span>
            </div>
            {notes && (
              <div className="pt-2 border-t border-neutral-dark">
                <span className="text-sm text-primary-light block mb-1">Notas:</span>
                <p className="text-sm text-primary">{notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* Status Actions */}
        {validTransitions.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-primary">Cambiar Estado</h3>
            <div className="flex flex-wrap gap-2">
              {validTransitions.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                  disabled={statusMutation.isPending}
                >
                  → {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Cancel Action */}
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          <section>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelBooking}
              disabled={cancelMutation.isPending}
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
            >
              {cancelMutation.isPending ? "Cancelando..." : "Cancelar Turno"}
            </Button>
          </section>
        )}

        {/* Metadata */}
        <section className="border-t border-neutral-dark pt-4">
          <div className="space-y-1 text-xs text-primary-light">
            <p>Creado: {formatDateTime(booking.createdAt)}</p>
            {"updatedAt" in booking && typeof booking.updatedAt === "string" ? (
              <p>Actualizado: {formatDateTime(booking.updatedAt)}</p>
            ) : (
              <p>Actualizado: -</p>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-dark bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-primary">
              {confirmingAction.action === "cancel"
                ? "Confirmar Cancelación"
                : "Confirmar Cambio de Estado"}
            </h3>
            <p className="mb-6 text-sm text-primary-light">
              {confirmingAction.action === "cancel"
                ? "¿Estás seguro de que querés cancelar este turno? Esta acción no se puede deshacer."
                : `¿Confirmas el cambio de estado a "${getStatusLabel(confirmingAction.newStatus!)}"?`}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmingAction(null)}>
                No, volver
              </Button>
              <Button onClick={executeAction}>
                Sí, confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingsPage() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [bookingPendingCancel, setBookingPendingCancel] = useState<BookingListItem | null>(null);

  const bookingsQuery = useBookingsQuery({ page, pageSize });
  const queryClient = useQueryClient();

  const cancelBookingMutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setFeedback({ tone: "success", message: "Turno cancelado correctamente." });
      setBookingPendingCancel(null);
    },
    onError: (error: AppError) => {
      setFeedback({ tone: "error", message: getBookingErrorMessage(error) });
      setBookingPendingCancel(null);
    },
  });

  const data = bookingsQuery.data?.data ?? [];
  const total = bookingsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  function handleCancelBooking(booking: BookingListItem) {
    setBookingPendingCancel(booking);
  }

  function handleOpenDetail(booking: BookingListItem) {
    setSelectedBooking(booking);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Turnos</h1>
          <p className="text-sm text-primary-light">
            Gestión completa de reservas y turnos del negocio
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 size-4" />
          Nuevo Turno
        </Button>
      </header>

      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

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
            {data.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin turnos"
                description="No hay turnos registrados. Crea el primero para comenzar."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-neutral-dark bg-neutral">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Teléfono
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Servicio
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Recurso
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Fecha y Hora
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Canal
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-primary">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((booking) => (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          onViewDetail={handleOpenDetail}
                          onCancel={handleCancelBooking}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-neutral-dark pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-primary-light">
                      Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, total)} de{" "}
                      {total} turnos
                    </p>
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
        <CreateBookingForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
            onFeedback={setFeedback}
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
