import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

/**
 * Domain model: Client representation for UI/business logic.
 */
export type ClientItem = {
  id: string;
  fullName: string;
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

/**
 * Form input model: Data structure for create/update forms.
 */
export type ClientUpsertInput = {
  fullName: string;
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
  clientId: string;
  sender: "CUSTOMER" | "AGENT";
  content: string;
  messageType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "STICKER" | "UNKNOWN";
  createdAt: string;
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

/**
 * API response schema: Client from backend GET endpoints.
 */
type ApiClient = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  completedBookingsCount?: number;
  metadata?: {
    lastBookingDate?: string;
    totalBookings?: number;
  };
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim();
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * API request schema: Client for backend POST/PUT endpoints.
 * Explicit contract reduces drift risk between form and API.
 */
type ApiClientRequest = {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
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

type ApiChatMessage = {
  id: string;
  clientId: string;
  sender: string;
  content?: string | null;
  messageType?: string | null;
  createdAt: string;
};

type ApiChatHistoryResponse = {
  data: ApiChatMessage[];
  meta?: {
    nextCursor?: string | null;
    hasMore?: boolean;
  };
};

function mapApiChatMessageToItem(api: ApiChatMessage): ChatMessage {
  const sender = api.sender === "CUSTOMER" ? "CUSTOMER" : "AGENT";
  const allowedMessageTypes: ChatMessage["messageType"][] = [
    "TEXT",
    "IMAGE",
    "AUDIO",
    "VIDEO",
    "DOCUMENT",
    "STICKER",
    "UNKNOWN",
  ];

  const messageType = allowedMessageTypes.includes(api.messageType as ChatMessage["messageType"])
    ? (api.messageType as ChatMessage["messageType"])
    : "UNKNOWN";

  return {
    id: api.id,
    clientId: api.clientId,
    sender,
    content: api.content ?? "",
    messageType,
    createdAt: api.createdAt,
  };
}

// =====================
// DTO Mapping Layer
// =====================
// Explicit mapping functions reduce contract drift and make API changes visible at compile time.

/**
 * Maps API response (backend schema) to domain model (UI schema).
 * Handles null -> undefined conversion and nested metadata extraction.
 */
function mapApiClientToItem(api: ApiClient): ClientItem {
  const { firstName, lastName } = splitFullName(api.fullName ?? "");

  return {
    id: api.id,
    fullName: api.fullName,
    firstName,
    lastName,
    phone: api.phone,
    email: api.email ?? undefined,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt ?? api.createdAt,
    lastBookingDate: api.metadata?.lastBookingDate,
    totalBookings: api.completedBookingsCount ?? api.metadata?.totalBookings ?? 0,
  };
}

/**
 * Maps form input to API request body.
 * Ensures form data matches backend contract exactly.
 * If backend schema changes, TypeScript will catch it here.
 */
function mapFormInputToApiRequest(input: ClientUpsertInput): ApiClientRequest {
  return {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };
}

function assertClientInput(input: ClientUpsertInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.fullName.trim()) {
    details.push({ field: "fullName", message: "El nombre completo es obligatorio." });
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

export async function createClient(input: ClientUpsertInput): Promise<ClientItem> {
  assertClientInput(input);

  const requestBody = mapFormInputToApiRequest(input);

  const response = await httpRequest<DataEnvelope<ApiClient>>("/clients", {
    method: "POST",
    body: requestBody,
  });

  return mapApiClientToItem(unwrapData<ApiClient>(response));
}

export async function updateClient(id: string, input: ClientUpsertInput): Promise<ClientItem> {
  assertClientInput(input);

  const requestBody = mapFormInputToApiRequest(input);

  const response = await httpRequest<DataEnvelope<ApiClient>>(`/clients/${id}`, {
    method: "PUT",
    body: requestBody,
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
  params?: { before?: string; size?: number }
): Promise<ChatHistoryResponse> {
  const queryParams = new URLSearchParams();
  if (params?.before) {
    queryParams.set("before", params.before);
  }

  const requestedSize = params?.size ?? 12;
  const normalizedSize = Math.min(Math.max(requestedSize, 1), 50);
  queryParams.set("size", String(normalizedSize));

  const query = queryParams.toString();
  const response = await httpRequest<ApiChatHistoryResponse>(
    `/clients/${clientId}/messages${query ? `?${query}` : ""}`,
  );

  return {
    messages: (response.data ?? []).map(mapApiChatMessageToItem),
    hasMore: Boolean(response.meta?.hasMore),
    nextCursor: response.meta?.nextCursor ?? undefined,
  };
}

/**
 * Client-specific error message mapper.
 * Uses the reusable createErrorMapper helper with module-specific overrides.
 */
export const toClientsFriendlyMessage = createErrorMapper({
  notFound: "Cliente no encontrado.",
  conflict: "Ya existe un cliente con estos datos. Verifica teléfono o email.",
  conflictFields: {
    phone: "Ya existe un cliente con este teléfono. Por favor, revisa el número ingresado.",
    email: "Ya existe un cliente con este email. Por favor, revisa el email ingresado.",
  },
});
