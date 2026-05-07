type WhatsappBookingPayload = {
  clientName: string;
  startTime: string;
  serviceName: string;
  resourceName: string;
};

const bookingDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatBookingDateTime(isoString: string, timezone: string): string {
  if (!bookingDateTimeFormatterCache.has(timezone)) {
    bookingDateTimeFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("es-PY", {
        timeZone: timezone,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
  }

  return bookingDateTimeFormatterCache.get(timezone)!.format(new Date(isoString));
}

export function normalizeWhatsappPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function buildBookingWhatsappMessage(
  booking: WhatsappBookingPayload,
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

export function createBookingWhatsappUrl(
  booking: WhatsappBookingPayload,
  phone: string | null | undefined,
  businessName: string,
  timezone: string,
): string | null {
  const whatsappPhone = phone ? normalizeWhatsappPhone(phone) : "";
  if (!whatsappPhone) {
    return null;
  }

  const message = buildBookingWhatsappMessage(booking, businessName, timezone);
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function createClientWhatsappUrl(
  clientName: string,
  phone: string | null | undefined,
  businessName: string,
): string | null {
  const whatsappPhone = phone ? normalizeWhatsappPhone(phone) : "";
  if (!whatsappPhone) {
    return null;
  }

  const message = `Hola ${clientName}, te escribo de ${businessName}.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}
