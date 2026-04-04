import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

// Reutilizamos tipos base del módulo agenda
export type {
  BookingStatus,
  BookingCardItem,
} from "@/features/agenda/agenda-service";

// Reutilizamos helpers del módulo agenda
export {
  getStatusLabel,
  getStatusTone,
  getValidStatusTransitions,
  updateBookingStatus,
  deleteBooking,
} from "@/features/agenda/agenda-service";

export type SourceChannel = "WEB" | "WHATSAPP" | "API" | "MCP" | "ADMIN";

export type BookingListItem = {
  id: string;
  resourceId: string;
  resourceName: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  locationId: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  sourceChannel: SourceChannel;
  notes?: string;
  createdAt: string;
};

export type BookingDetail = BookingListItem & {
  tenantId: string;
  clientId?: string;
  googleEventId?: string;
  updatedAt: string;
};

export type CreateBookingInput = {
  resourceId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  notes?: string;
};

export type BookingListParams = {
  page: number;
  pageSize: number;
};

export type BookingListResult = {
  data: BookingListItem[];
  total: number;
};

export type BookingServiceCatalogItem = {
  id: string;
  name: string;
  durationMinutes: number;
  active: boolean;
};

type DataEnvelope<T> = { data: T };
type PagedEnvelope<T> = {
  data: T[];
  meta: {
    page: number;
    size: number;
    total: number;
  };
};

type ApiBooking = {
  id: string;
  tenantId: string;
  resourceId: string;
  serviceId: string;
  clientId?: string | null;
  locationId: string;
  startTime: string;
  endTime: string;
  status: BookingListItem["status"];
  sourceChannel: SourceChannel;
  googleEventId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  resourceName?: string | null;
  serviceName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  resource?: {
    name?: string | null;
  } | null;
  service?: {
    name?: string | null;
  } | null;
  client?: {
    fullName?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
};

type ApiService = {
  id: string;
  name: string;
  durationMinutes: number;
  active: boolean;
};

function pickFirstNonEmptyValue(values: Array<string | null | undefined>, fallback: string): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return fallback;
}

function mapApiBookingToListItem(api: ApiBooking): BookingListItem {
  return {
    id: api.id,
    resourceId: api.resourceId,
    resourceName: pickFirstNonEmptyValue([api.resourceName, api.resource?.name], "Sin asignar"),
    serviceId: api.serviceId,
    serviceName: pickFirstNonEmptyValue([api.serviceName, api.service?.name], "Servicio"),
    clientName: pickFirstNonEmptyValue(
      [api.clientName, api.client?.fullName, api.client?.name],
      "Cliente",
    ),
    clientPhone: pickFirstNonEmptyValue([api.clientPhone, api.client?.phone], ""),
    locationId: api.locationId,
    startTime: api.startTime,
    endTime: api.endTime,
    status: api.status,
    sourceChannel: api.sourceChannel,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt,
  };
}

function mapApiBookingToDetail(api: ApiBooking): BookingDetail {
  return {
    ...mapApiBookingToListItem(api),
    tenantId: api.tenantId,
    clientId: api.clientId ?? undefined,
    googleEventId: api.googleEventId ?? undefined,
    updatedAt: api.updatedAt,
  };
}

function assertCreateBookingInput(input: CreateBookingInput) {
  const details: Array<{ field: string; message: string }> = [];

  if (!input.resourceId.trim()) {
    details.push({ field: "resourceId", message: "Debes seleccionar un recurso." });
  }
  if (!input.serviceId.trim()) {
    details.push({ field: "serviceId", message: "Debes seleccionar un servicio." });
  }
  if (!input.clientName.trim()) {
    details.push({ field: "clientName", message: "El nombre del cliente es obligatorio." });
  }
  if (!input.clientPhone.trim()) {
    details.push({ field: "clientPhone", message: "El teléfono del cliente es obligatorio." });
  }
  if (!input.date.trim()) {
    details.push({ field: "date", message: "La fecha es obligatoria." });
  }
  if (!input.startTime.trim()) {
    details.push({ field: "startTime", message: "La hora de inicio es obligatoria." });
  }

  if (details.length > 0) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Errores de validación",
      details,
    });
  }
}

export async function fetchBookings(params: BookingListParams): Promise<BookingListResult> {
  const response = await httpRequest<PagedEnvelope<ApiBooking>>(
    `/bookings?page=${params.page}&size=${params.pageSize}`,
  );

  return {
    data: response.data.map(mapApiBookingToListItem),
    total: response.meta.total,
  };
}

export async function fetchBookingById(id: string): Promise<BookingDetail> {
  const response = await httpRequest<DataEnvelope<ApiBooking>>(`/bookings/${id}`);
  return mapApiBookingToDetail(unwrapData<ApiBooking>(response));
}

export async function createBooking(input: CreateBookingInput): Promise<BookingDetail> {
  assertCreateBookingInput(input);

  const response = await httpRequest<DataEnvelope<ApiBooking>>("/bookings", {
    method: "POST",
    body: {
      resourceId: input.resourceId,
      serviceId: input.serviceId,
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone.trim(),
      clientEmail: input.clientEmail?.trim() || null,
      date: input.date,
      startTime: input.startTime,
      notes: input.notes?.trim() || null,
    },
  });

  return mapApiBookingToDetail(unwrapData<ApiBooking>(response));
}

export async function fetchBookingServicesCatalog(): Promise<BookingServiceCatalogItem[]> {
  const response = await httpRequest<DataEnvelope<ApiService[]>>("/services");
  return unwrapData<ApiService[]>(response).map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    active: service.active,
  }));
}

export function getSourceChannelLabel(channel: SourceChannel): string {
  const labels: Record<SourceChannel, string> = {
    WEB: "Web",
    WHATSAPP: "WhatsApp",
    API: "API",
    MCP: "MCP",
    ADMIN: "Admin",
  };
  return labels[channel];
}

/**
 * Reusable error mapper configured for Bookings module.
 * Maps API errors to user-friendly Spanish messages.
 */
export const toBookingsFriendlyMessage = createErrorMapper({
  notFound: "El turno solicitado no existe o ya fue eliminado.",
  conflict: "Conflicto detectado: puede haber un turno superpuesto. Verifica los horarios.",
  validationError: "Error de validación en los datos del turno.",
  fallback: "Ocurrió un error al procesar la solicitud.",
});

/**
 * Extended error handler for booking-specific error codes not covered by the generic mapper.
 * Use this when you need custom logic beyond field-based or status-based errors.
 */
export function handleBookingSpecificErrors(error: AppError): string | null {
  if (error.code === "BOOKING_CONFLICT") {
    return "El recurso ya tiene un turno reservado en ese horario. Elegí otro horario o recurso.";
  }

  if (error.code === "INVALID_STATE_TRANSITION") {
    return "No se puede cambiar el estado del turno. Verifica las transiciones permitidas.";
  }

  if (error.status === 422) {
    return "La operación no es válida en el estado actual del turno.";
  }

  return null; // Fall through to generic mapper
}

/**
 * Complete error message resolver for bookings.
 * First checks booking-specific errors, then falls back to the generic mapper.
 */
export function getBookingErrorMessage(error: AppError): string {
  const specificMessage = handleBookingSpecificErrors(error);
  return specificMessage ?? toBookingsFriendlyMessage(error);
}
