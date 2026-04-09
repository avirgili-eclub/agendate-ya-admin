import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export type BookingCardItem = {
  id: string;
  resourceId: string;
  resourceName: string;
  locationId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone?: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  sourceChannel: "WEB" | "WHATSAPP" | "API" | "MCP" | "ADMIN";
  notes?: string;
};

export type LocationItem = {
  id: string;
  name: string;
  active: boolean;
};

export type ResourceItem = {
  id: string;
  locationId: string;
  name: string;
  type: "PROFESSIONAL" | "TABLE" | "ROOM" | "EQUIPMENT";
  active: boolean;
};

export type BookingListParams = {
  page: number;
  pageSize: number;
};

export type BookingListResult = {
  data: BookingCardItem[];
  total: number;
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
  status: BookingStatus;
  sourceChannel: BookingCardItem["sourceChannel"];
  googleEventId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  resourceName?: string | null;
  serviceName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
};

type ApiLocation = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResource = {
  id: string;
  locationId: string;
  resourceType: ResourceItem["type"];
  name: string;
  description?: string | null;
  capacity?: number | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapApiBookingToCard(api: ApiBooking): BookingCardItem {
  return {
    id: api.id,
    resourceId: api.resourceId,
    resourceName: api.resourceName ?? "Sin asignar",
    locationId: api.locationId,
    serviceId: api.serviceId,
    serviceName: api.serviceName ?? "Servicio",
    clientName: api.clientName ?? "Cliente",
    clientPhone: api.clientPhone ?? undefined,
    startTime: api.startTime,
    endTime: api.endTime,
    status: api.status,
    sourceChannel: api.sourceChannel,
    notes: api.notes ?? undefined,
  };
}

function mapApiLocationToItem(api: ApiLocation): LocationItem {
  return {
    id: api.id,
    name: api.name,
    active: api.active,
  };
}

function mapApiResourceToItem(api: ApiResource): ResourceItem {
  return {
    id: api.id,
    locationId: api.locationId,
    name: api.name,
    type: api.resourceType,
    active: api.active,
  };
}

function dedupeApiBookingsById(bookings: ApiBooking[]): ApiBooking[] {
  const byId = new Map<string, ApiBooking>();

  bookings.forEach((candidate) => {
    const current = byId.get(candidate.id);
    if (!current) {
      byId.set(candidate.id, candidate);
      return;
    }

    const currentUpdatedAt = new Date(current.updatedAt).getTime();
    const candidateUpdatedAt = new Date(candidate.updatedAt).getTime();

    if (!Number.isNaN(candidateUpdatedAt) && candidateUpdatedAt >= currentUpdatedAt) {
      byId.set(candidate.id, candidate);
    }
  });

  return Array.from(byId.values());
}

export async function fetchBookings(params: BookingListParams): Promise<BookingListResult> {
  const response = await httpRequest<PagedEnvelope<ApiBooking>>(
    `/bookings?page=${params.page}&size=${params.pageSize}`,
  );

  return {
    data: response.data.map(mapApiBookingToCard),
    total: response.meta.total,
  };
}

export type CalendarBookingsParams = {
  resourceIds: string[];
  startDate: string;
  endDate: string;
  statuses?: BookingStatus[];
};

export async function fetchCalendarBookings(params: CalendarBookingsParams): Promise<BookingCardItem[]> {
  if (params.endDate < params.startDate) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "La fecha final no puede ser anterior a la fecha inicial.",
    });
  }

  const searchParams = new URLSearchParams({
    resourceIds: params.resourceIds.join(","),
    startDate: params.startDate,
    endDate: params.endDate,
    statuses: (params.statuses && params.statuses.length > 0
      ? params.statuses
      : ["PENDING", "CONFIRMED"]).join(","),
  });

  const response = await httpRequest<DataEnvelope<ApiBooking[]>>(
    `/bookings/calendar?${searchParams.toString()}`,
  );

  const apiBookings = unwrapData<ApiBooking[]>(response);
  return dedupeApiBookingsById(apiBookings).map(mapApiBookingToCard);
}

export async function fetchLocations(): Promise<LocationItem[]> {
  const response = await httpRequest<DataEnvelope<ApiLocation[]>>("/locations");
  return unwrapData<ApiLocation[]>(response).map(mapApiLocationToItem);
}

export async function fetchLocationResources(locationId: string): Promise<ResourceItem[]> {
  const response = await httpRequest<DataEnvelope<ApiResource[]>>(`/locations/${locationId}/resources`);
  return unwrapData<ApiResource[]>(response).map(mapApiResourceToItem);
}

export async function fetchResourceById(resourceId: string): Promise<ResourceItem> {
  const response = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${resourceId}`);
  return mapApiResourceToItem(unwrapData<ApiResource>(response));
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<BookingCardItem> {
  const response = await httpRequest<DataEnvelope<ApiBooking>>(`/bookings/${bookingId}/status`, {
    method: "PUT",
    body: { status },
  });
  return mapApiBookingToCard(unwrapData<ApiBooking>(response));
}

export async function deleteBooking(bookingId: string): Promise<void> {
  await httpRequest(`/bookings/${bookingId}`, {
    method: "DELETE",
  });
}

export function getStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Completado",
    NO_SHOW: "No asistió",
  };
  return labels[status];
}

export function getStatusTone(
  status: BookingStatus,
): "success" | "warning" | "neutral" | "danger" {
  const tones: Record<BookingStatus, "success" | "warning" | "neutral" | "danger"> = {
    PENDING: "warning",
    CONFIRMED: "success",
    CANCELLED: "neutral",
    COMPLETED: "success",
    NO_SHOW: "danger",
  };
  return tones[status];
}

export function getValidStatusTransitions(currentStatus: BookingStatus): BookingStatus[] {
  const transitions: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
    CANCELLED: [],
    COMPLETED: [],
    NO_SHOW: [],
  };
  return transitions[currentStatus];
}

export function toAgendaFriendlyMessage(error: AppError): string {
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

  if (error.status === 401) {
    return "Tu sesión expiró o no es válida. Inicia sesión nuevamente para continuar.";
  }

  if (error.status === 403) {
    return "No tienes permisos para ver esta agenda.";
  }

  if (error.status === 404) {
    return "El turno solicitado no existe o ya fue eliminado.";
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(". ");
  }

  return error.message || "Ocurrió un error al procesar la solicitud.";
}
