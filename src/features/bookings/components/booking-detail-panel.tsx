import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import { useBookingDetailQuery } from "@/features/bookings/use-bookings-query";
import {
  deleteBooking,
  getBookingErrorMessage,
  getSourceChannelLabel,
  getStatusLabel,
  getStatusTone,
  getValidStatusTransitions,
  updateBookingStatus,
  type BookingListItem,
  type BookingStatus,
} from "@/features/bookings/bookings-service";
import { Button } from "@/shared/ui/button";
import { StatusChip } from "@/shared/ui/status-chip";
import { useFeedback } from "@/shared/notifications/use-feedback";

export type BookingDetailPanelProps = {
  bookingId: string;
  bookingSummary?: BookingListItem;
  onClose: () => void;
  onRefresh: () => void;
};

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

export function BookingDetailPanel({ bookingId, bookingSummary, onClose, onRefresh }: BookingDetailPanelProps) {
  const queryClient = useQueryClient();
  const { showFeedback } = useFeedback("booking");
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const isProfessional = currentRole === "PROFESSIONAL";

  const detailQuery = useBookingDetailQuery(bookingId);
  const [confirmingAction, setConfirmingAction] = useState<{
    action: "cancel" | "status";
    newStatus?: BookingStatus;
  } | null>(null);
  const detailError = detailQuery.error as unknown as AppError | undefined;
  const isSilentNotFound = isProfessional && detailQuery.isError && detailError?.status === 404;

  useEffect(() => {
    if (isSilentNotFound) {
      onClose();
    }
  }, [isSilentNotFound, onClose]);

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
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-detail", bookingId] });
      onRefresh();
      showFeedback("success", "Estado del turno actualizado correctamente.");
      setConfirmingAction(null);
    },
    onError: (error: AppError) => {
      showFeedback("error", getBookingErrorMessage(error));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onRefresh();
      showFeedback("success", "Turno cancelado correctamente.");
      onClose();
    },
    onError: (error: AppError) => {
      showFeedback("error", getBookingErrorMessage(error));
    },
  });

  if (detailQuery.isLoading && !bookingSummary) {
    return <div className="px-6 py-8 text-center text-sm text-primary-light">Cargando detalles del turno...</div>;
  }

  const booking = detailQuery.data ?? bookingSummary;

  if (isSilentNotFound) {
    return null;
  }

  if (!booking) {
    return (
      <div className="px-6 py-8 text-center text-sm text-red-600">
        Error al cargar el turno. Intenta nuevamente.
      </div>
    );
  }

  const clientName = pickPreferredText(detailQuery.data?.clientName, bookingSummary?.clientName, "Cliente");
  const clientPhone = pickPreferredText(detailQuery.data?.clientPhone, bookingSummary?.clientPhone);
  const serviceName = pickPreferredText(detailQuery.data?.serviceName, bookingSummary?.serviceName, "Servicio");
  const resourceName = pickPreferredText(detailQuery.data?.resourceName, bookingSummary?.resourceName, "Sin asignar");
  const reservationCode = pickPreferredText(
    detailQuery.data?.reservationCode,
    bookingSummary?.reservationCode,
    "Sin codigo",
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
      {detailQuery.isError && bookingSummary && !isSilentNotFound && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No se pudieron cargar todos los detalles del turno. Mostrando datos disponibles del listado.
        </div>
      )}

      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-primary">Cliente</h3>
          <div className="space-y-2 rounded-md bg-neutral p-4">
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Nombre:</span>
              <span className="text-sm font-medium text-primary">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Telefono:</span>
              <span className="text-sm font-medium text-primary">{clientPhone}</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-primary">Detalles del Turno</h3>
          <div className="space-y-2 rounded-md bg-neutral p-4">
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Cod. reserva:</span>
              <span className="text-sm font-semibold uppercase text-primary">{reservationCode}</span>
            </div>
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
              <span className="text-sm font-medium text-primary">{formatDateTime(booking.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Fin:</span>
              <span className="text-sm font-medium text-primary">{formatTime(booking.endTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Estado:</span>
              <StatusChip tone={getStatusTone(booking.status)} label={getStatusLabel(booking.status)} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-light">Canal:</span>
              <span className="text-sm font-medium text-primary">{getSourceChannelLabel(booking.sourceChannel)}</span>
            </div>
            {notes && (
              <div className="border-t border-neutral-dark pt-2">
                <span className="mb-1 block text-sm text-primary-light">Notas:</span>
                <p className="text-sm text-primary">{notes}</p>
              </div>
            )}
          </div>
        </section>

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
                  {"->"} {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </section>
        )}

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

      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-dark bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-primary">
              {confirmingAction.action === "cancel" ? "Confirmar Cancelacion" : "Confirmar Cambio de Estado"}
            </h3>
            <p className="mb-6 text-sm text-primary-light">
              {confirmingAction.action === "cancel"
                ? "Estas seguro de que queres cancelar este turno? Esta accion no se puede deshacer."
                : `Confirmas el cambio de estado a "${getStatusLabel(confirmingAction.newStatus!)}"?`}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmingAction(null)}>
                No, volver
              </Button>
              <Button onClick={executeAction}>Si, confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
