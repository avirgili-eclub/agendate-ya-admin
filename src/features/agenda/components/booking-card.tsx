import { useState, type MouseEvent } from "react";
import { MessageCircle } from "lucide-react";

import {
  getStatusLabel,
  getStatusTone,
  getValidStatusTransitions,
  type BookingCardItem,
  type BookingStatus,
} from "@/features/agenda/agenda-service";
import { formatBookingDateTime, formatTime } from "@/features/agenda/utils/calendar-date";

type BookingCardProps = {
  booking: BookingCardItem;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
  businessName: string;
  timezone: string;
};

function normalizeWhatsappPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function buildWhatsappMessage(
  booking: BookingCardItem,
  businessName: string,
  timezone: string,
): string {
  const formattedDateTime = formatBookingDateTime(booking.startTime, timezone);

  return [
    businessName,
    `Hola ${booking.clientName}! Esperamos que estes muy bien.`,
    `Queremos confirmar si asistiras a tu turno del ${formattedDateTime}.`,
    `Servicio: ${booking.serviceName}`,
    `Profesional: ${booking.resourceName}`,
    "Quedamos atentos. Muchas gracias!",
  ].join("\n");
}

export function BookingCard({ booking, onStatusChange, onDelete, businessName, timezone }: BookingCardProps) {
  const [showActions, setShowActions] = useState(false);
  const validTransitions = getValidStatusTransitions(booking.status).filter(
    (status) => status !== "CANCELLED",
  );
  const tone = getStatusTone(booking.status);
  const accentByTone: Record<typeof tone, string> = {
    success: "border-l-4 border-l-green-500",
    warning: "border-l-4 border-l-amber-500",
    neutral: "border-l-4 border-l-slate-400",
    danger: "border-l-4 border-l-red-500",
  };
  const dotByTone: Record<typeof tone, string> = {
    success: "bg-green-600",
    warning: "bg-amber-500",
    neutral: "bg-slate-500",
    danger: "bg-red-600",
  };

  const whatsappPhone = booking.clientPhone ? normalizeWhatsappPhone(booking.clientPhone) : "";

  const handleOpenWhatsapp = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!whatsappPhone) {
      return;
    }

    const message = buildWhatsappMessage(booking, businessName, timezone);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`group relative mb-2 cursor-pointer rounded-lg border border-neutral-dark bg-white p-2 shadow-sm transition-all hover:shadow-md ${accentByTone[tone]}`}
      onClick={() => setShowActions((previous) => !previous)}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-primary">
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral px-1.5 py-0.5 text-[10px] font-medium text-primary-light">
            <span className={`size-1.5 rounded-full ${dotByTone[tone]}`} aria-hidden="true" />
            {getStatusLabel(booking.status)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <p className="truncate text-xs font-medium text-primary" title={booking.clientName}>
            {booking.clientName}
          </p>
          <button
            type="button"
            onClick={handleOpenWhatsapp}
            disabled={!whatsappPhone}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:text-neutral-dark"
            aria-label={`Enviar WhatsApp a ${booking.clientName}`}
            title={whatsappPhone ? "Enviar mensaje por WhatsApp" : "Cliente sin teléfono"}
          >
            <MessageCircle className="size-3" />
          </button>
        </div>
        <p className="truncate text-xs text-primary-light" title={booking.serviceName}>
          {booking.serviceName}
        </p>
        <p className="truncate text-[11px] text-primary-light" title={booking.resourceName}>
          Prof.: {booking.resourceName}
        </p>
        {booking.notes && (
          <p className="line-clamp-2 text-[11px] text-primary-light" title={booking.notes}>
            Nota: {booking.notes}
          </p>
        )}
      </div>

      {showActions && validTransitions.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-neutral-dark pt-2">
          {validTransitions.map((status) => (
            <button
              key={status}
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange(booking.id, status);
                setShowActions(false);
              }}
              className="block w-full rounded px-2 py-1 text-left text-xs text-primary-light hover:bg-neutral"
            >
              {getStatusLabel(status)}
            </button>
          ))}
          <button
            onClick={(event) => {
              event.stopPropagation();
              if (confirm("¿Estás seguro que querés cancelar este turno?")) {
                onDelete(booking.id);
              }
              setShowActions(false);
            }}
            className="block w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Cancelar turno
          </button>
        </div>
      )}
    </div>
  );
}