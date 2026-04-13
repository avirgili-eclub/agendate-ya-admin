export type CreateBookingRequest = {
  serviceId: string;
  resourceId: string;
  date: string;
  time: string;
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

export type PublicApiErrorCode =
  | "NETWORK_TIMEOUT"
  | "NETWORK_ERROR"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "NOT_FOUND";

export type PublicApiError = {
  code: PublicApiErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
};

export type PublicBookingSummary = {
  id: string;
  serviceName: string;
  resourceName: string;
  date: string;
  time: string;
  status: string;
};

export type PublicBookingDetail = {
  id: string;
  serviceName: string;
  resourceName: string;
  date: string;
  time: string;
  durationMinutes: number;
  locationAddress?: string;
  timezone?: string;
};

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE_URL ?? "";
const DEFAULT_TIMEOUT_MS = 8_000;

function buildPublicApiError(
  code: PublicApiErrorCode,
  message: string,
  retryable: boolean,
  status?: number,
): PublicApiError {
  return {
    code,
    message,
    retryable,
    status,
  };
}

function isAbortTimeout(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError",
  );
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || isAbortTimeout(error);
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(
  endpoint: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return fetchImpl(endpoint, init);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(endpoint, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function requestWithRetry(
  endpoint: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  attempts: number,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchWithTimeout(endpoint, init, fetchImpl);
    } catch (requestError) {
      lastError = requestError;

      if (attempt < attempts && isNetworkError(requestError)) {
        await wait(250 * attempt);
        continue;
      }

      break;
    }
  }

  if (isAbortTimeout(lastError)) {
    throw buildPublicApiError(
      "NETWORK_TIMEOUT",
      "La solicitud tardo demasiado. Intenta nuevamente.",
      true,
    );
  }

  if (isNetworkError(lastError)) {
    throw buildPublicApiError(
      "NETWORK_ERROR",
      "No pudimos conectar con el servidor. Revisa tu conexion e intenta nuevamente.",
      true,
    );
  }

  throw buildPublicApiError(
    "SERVER_ERROR",
    "Ocurrio un error inesperado en la solicitud.",
    true,
  );
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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

  const payload = await safeJson(response);

  if (!response.ok) {
    if (response.status === 409) {
      throw {
        code: "SLOT_CONFLICT",
        message: payload.message ?? "El horario seleccionado ya no esta disponible",
      } as BookingError;
    }

    if (response.status >= 400 && response.status < 500) {
      throw {
        code: "VALIDATION_ERROR",
        message: payload.message ?? "Los datos ingresados no son validos",
      } as BookingError;
    }

    throw {
      code: "SERVER_ERROR",
      message: payload.message ?? "Ocurrio un error al crear la reserva",
    } as BookingError;
  }

  return {
    bookingId: String(payload.bookingId ?? payload.id ?? ""),
    status: payload.status === "pending" ? "pending" : "confirmed",
  };
}

export async function listBookingsByPhone(
  slug: string,
  phone: string,
  fetchImpl: typeof fetch,
): Promise<PublicBookingSummary[]> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/bookings?phone=${encodeURIComponent(phone)}`;

  const response = await requestWithRetry(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    fetchImpl,
    2,
  );

  if (!response.ok) {
    const payload = await safeJson(response);

    if (response.status === 404) {
      return [];
    }

    if (response.status >= 400 && response.status < 500) {
      throw buildPublicApiError(
        "VALIDATION_ERROR",
        toStringValue(payload?.message, "Los datos ingresados no son validos."),
        false,
        response.status,
      );
    }

    throw buildPublicApiError(
      "SERVER_ERROR",
      toStringValue(payload?.message, "No pudimos cargar tus turnos en este momento."),
      true,
      response.status,
    );
  }

  const payload = await safeJson(response);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.bookings)
      ? payload.bookings
      : Array.isArray(payload.data)
        ? payload.data
        : [];

  return items.map((item: any) => ({
    id: toStringValue(item.id),
    serviceName: toStringValue(item.serviceName, "Servicio"),
    resourceName: toStringValue(item.resourceName, "Profesional"),
    date: toStringValue(item.date),
    time: toStringValue(item.time),
    status: toStringValue(item.status, "PENDING"),
  }));
}

export async function cancelBooking(
  slug: string,
  bookingId: string,
  fetchImpl: typeof fetch,
): Promise<void> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/bookings/${bookingId}/cancel`;

  const response = await requestWithRetry(
    endpoint,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
    fetchImpl,
    2,
  );

  if (!response.ok) {
    const payload = await safeJson(response);

    if (response.status === 404) {
      throw buildPublicApiError(
        "NOT_FOUND",
        "El turno ya no existe o fue cancelado previamente.",
        false,
        response.status,
      );
    }

    if (response.status >= 400 && response.status < 500) {
      throw buildPublicApiError(
        "VALIDATION_ERROR",
        toStringValue(payload?.message, "No pudimos validar la cancelacion solicitada."),
        false,
        response.status,
      );
    }

    throw buildPublicApiError(
      "SERVER_ERROR",
      toStringValue(payload?.message, "No pudimos cancelar el turno en este momento."),
      true,
      response.status,
    );
  }
}

export async function fetchBookingById(
  slug: string,
  bookingId: string,
  fetchImpl: typeof fetch,
): Promise<PublicBookingDetail | null> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/bookings/${bookingId}`;

  const response = await requestWithRetry(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    fetchImpl,
    2,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw buildPublicApiError(
      "SERVER_ERROR",
      `No pudimos obtener el detalle de la reserva (${response.status}).`,
      true,
      response.status,
    );
  }

  const payload = await safeJson(response);
  const item = payload?.booking ?? payload?.data ?? payload;

  return {
    id: toStringValue(item?.id, bookingId),
    serviceName: toStringValue(item?.serviceName, "Servicio"),
    resourceName: toStringValue(item?.resourceName, "Profesional"),
    date: toStringValue(item?.date),
    time: toStringValue(item?.time),
    durationMinutes: toNumberValue(item?.durationMinutes, 0),
    locationAddress: toStringValue(item?.locationAddress) || undefined,
    timezone: toStringValue(item?.timezone) || undefined,
  };
}
