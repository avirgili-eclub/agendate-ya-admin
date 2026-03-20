import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

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
};

type ApiService = {
  id: string;
  name: string;
  durationMinutes: number;
  active: boolean;
};

function mapApiBookingToListItem(api: ApiBooking): BookingListItem {
  return {
    id: api.id,
    resourceId: api.resourceId,
    resourceName: api.resourceName ?? "Sin asignar",
    serviceId: api.serviceId,
    serviceName: api.serviceName ?? "Servicio",
    clientName: api.clientName ?? "Cliente",
    clientPhone: api.clientPhone ?? "",
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

export function toBookingsFriendlyMessage(error: AppError): string {
  if (error.code === "BOOKING_CONFLICT") {
    return "El recurso ya tiene un turno reservado en ese horario. Elegí otro horario o recurso.";
  }

  if (error.code === "INVALID_STATE_TRANSITION") {
    return "No se puede cambiar el estado del turno. Verifica las transiciones permitidas.";
  }

  if (error.status === 422) {
    return "La operación no es válida en el estado actual del turno.";
  }

  if (error.status === 409) {
    return "Conflicto detectado: puede haber un turno superpuesto. Verifica los horarios.";
  }

  if (error.status === 404) {
    return "El turno solicitado no existe o ya fue eliminado.";
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(". ");
  }

  return error.message || "Ocurrió un error al procesar la solicitud.";
}
