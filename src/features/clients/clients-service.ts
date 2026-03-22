import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type ClientItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastBookingDate?: string;
  totalBookings: number;
};

export type ClientUpsertInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type ClientBookingHistoryItem = {
  id: string;
  serviceName: string;
  resourceName?: string;
  locationName?: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "client" | "system" | "agent";
  content: string;
  timestamp: string;
};

export type ChatHistoryResponse = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
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

type ApiClient = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    lastBookingDate?: string;
    totalBookings?: number;
  };
};

type ApiClientBooking = {
  id: string;
  serviceName: string;
  resourceName?: string | null;
  locationName?: string | null;
  status: string;
  scheduledAt: string;
  createdAt: string;
};

function mapApiClientToItem(api: ApiClient): ClientItem {
  return {
    id: api.id,
    firstName: api.firstName,
    lastName: api.lastName,
    phone: api.phone,
    email: api.email ?? undefined,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    lastBookingDate: api.metadata?.lastBookingDate,
    totalBookings: api.metadata?.totalBookings ?? 0,
  };
}

function assertClientInput(input: ClientUpsertInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.firstName.trim()) {
    details.push({ field: "firstName", message: "El nombre es obligatorio." });
  }
  if (!input.lastName.trim()) {
    details.push({ field: "lastName", message: "El apellido es obligatorio." });
  }
  if (!input.phone.trim()) {
    details.push({ field: "phone", message: "El teléfono es obligatorio." });
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    details.push({ field: "email", message: "El email no es válido." });
  }
  if (details.length > 0) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details,
    });
  }
}

export async function fetchClients(params?: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<{ clients: ClientItem[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set("search", params.search);
  if (params?.page !== undefined) queryParams.set("page", String(params.page));
  if (params?.size !== undefined) queryParams.set("size", String(params.size));

  const query = queryParams.toString();
  const response = await httpRequest<PagedEnvelope<ApiClient>>(`/clients${query ? `?${query}` : ""}`);
  
  return {
    clients: response.data.map(mapApiClientToItem),
    total: response.meta.total,
  };
}

export async function fetchClientById(id: string): Promise<ClientItem> {
  const response = await httpRequest<DataEnvelope<ApiClient>>(`/clients/${id}`);
  return mapApiClientToItem(unwrapData<ApiClient>(response));
}

export async function updateClient(id: string, input: ClientUpsertInput): Promise<ClientItem> {
  assertClientInput(input);

  const response = await httpRequest<DataEnvelope<ApiClient>>(`/clients/${id}`, {
    method: "PUT",
    body: input,
  });

  return mapApiClientToItem(unwrapData<ApiClient>(response));
}

export async function fetchClientBookingHistory(
  clientId: string,
  params?: { page?: number; size?: number }
): Promise<{ bookings: ClientBookingHistoryItem[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.set("page", String(params.page));
  if (params?.size !== undefined) queryParams.set("size", String(params.size));

  const query = queryParams.toString();
  const response = await httpRequest<PagedEnvelope<ApiClientBooking>>(
    `/clients/${clientId}/bookings${query ? `?${query}` : ""}`
  );

  return {
    bookings: response.data.map((b) => ({
      id: b.id,
      serviceName: b.serviceName,
      resourceName: b.resourceName ?? undefined,
      locationName: b.locationName ?? undefined,
      status: b.status,
      scheduledAt: b.scheduledAt,
      createdAt: b.createdAt,
    })),
    total: response.meta.total,
  };
}

export async function fetchClientChatHistory(
  clientId: string,
  params?: { cursor?: string; size?: number }
): Promise<ChatHistoryResponse> {
  // NOTE: Backend endpoint not available yet
  // When available, implement as:
  // const queryParams = new URLSearchParams();
  // if (params?.cursor) queryParams.set("cursor", params.cursor);
  // if (params?.size !== undefined) queryParams.set("size", String(params.size));
  // const query = queryParams.toString();
  // const response = await httpRequest<{ data: ChatMessage[]; hasMore: boolean; nextCursor?: string }>(
  //   `/clients/${clientId}/chat-history${query ? `?${query}` : ""}`
  // );
  // return response;

  // Graceful mock mode for now
  return {
    messages: [],
    hasMore: false,
  };
}

export function toClientsFriendlyMessage(error: AppError): string {
  if (error.status === 409) {
    const phoneConflict = error.details?.find((d) => d.field === "phone");
    const emailConflict = error.details?.find((d) => d.field === "email");
    
    if (phoneConflict) {
      return "Ya existe un cliente con este teléfono. Por favor, revisa el número ingresado.";
    }
    if (emailConflict) {
      return "Ya existe un cliente con este email. Por favor, revisa el email ingresado.";
    }
    return "Ya existe un cliente con estos datos. Verifica teléfono o email.";
  }

  if (error.code === "NOT_FOUND") {
    return "Cliente no encontrado.";
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(" ");
  }

  return error.message ?? "Ocurrió un error inesperado.";
}
