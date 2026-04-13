export type CreateBookingRequest = {
  serviceId: string;
  resourceId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
};

export type CreateBookingResponse = {
  bookingId: string;
  status: "confirmed" | "pending";
};

export type BookingError = {
  code: "SLOT_CONFLICT" | "VALIDATION_ERROR" | "SERVER_ERROR";
  message: string;
};

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE_URL ?? "";

export async function createBooking(
  slug: string,
  request: CreateBookingRequest,
  fetchImpl: typeof fetch,
): Promise<CreateBookingResponse> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/bookings`;

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json();

  if (!response.ok) {
    if (response.status === 409) {
      throw {
        code: "SLOT_CONFLICT",
        message: payload.message ?? "El horario seleccionado ya no está disponible",
      } as BookingError;
    }

    if (response.status >= 400 && response.status < 500) {
      throw {
        code: "VALIDATION_ERROR",
        message: payload.message ?? "Los datos ingresados no son válidos",
      } as BookingError;
    }

    throw {
      code: "SERVER_ERROR",
      message: payload.message ?? "Ocurrió un error al crear la reserva",
    } as BookingError;
  }

  return {
    bookingId: String(payload.bookingId ?? payload.id ?? ""),
    status: payload.status === "pending" ? "pending" : "confirmed",
  };
}
