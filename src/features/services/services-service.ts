import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  durationMinutes: number;
  price: string;
  currency: string;
  requiresResource: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceUpsertInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  requiresResource: boolean;
  active: boolean;
};

type DataEnvelope<T> = { data: T };

type ApiService = {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  requiresResource: boolean;
  metadata?: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapApiServiceToItem(api: ApiService): ServiceItem {
  const imageUrl = typeof api.metadata?.imageUrl === "string" ? api.metadata.imageUrl : undefined;
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? undefined,
    imageUrl,
    durationMinutes: api.durationMinutes,
    price: api.price,
    currency: api.currency,
    requiresResource: api.requiresResource,
    active: api.active,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function assertServiceInput(input: ServiceUpsertInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.name.trim()) {
    details.push({ field: "name", message: "El nombre es obligatorio." });
  }
  if (input.durationMinutes < 1) {
    details.push({ field: "durationMinutes", message: "La duración mínima es 1 minuto." });
  }
  if (input.price < 0) {
    details.push({ field: "price", message: "El precio debe ser mayor o igual a 0." });
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

export async function fetchServices(): Promise<ServiceItem[]> {
  const response = await httpRequest<DataEnvelope<ApiService[]>>("/services");
  return unwrapData<ApiService[]>(response).map(mapApiServiceToItem);
}

export async function fetchServiceById(id: string): Promise<ServiceItem> {
  const response = await httpRequest<DataEnvelope<ApiService>>(`/services/${id}`);
  return mapApiServiceToItem(unwrapData<ApiService>(response));
}

export async function createService(input: ServiceUpsertInput): Promise<ServiceItem> {
  assertServiceInput(input);

  const response = await httpRequest<DataEnvelope<ApiService>>("/services", {
    method: "POST",
    body: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
      currency: input.currency,
      requiresResource: input.requiresResource,
      metadata: {
        imageUrl: input.imageUrl ?? null,
      },
    },
  });

  return mapApiServiceToItem(unwrapData<ApiService>(response));
}

export async function updateService(id: string, input: ServiceUpsertInput): Promise<ServiceItem> {
  assertServiceInput(input);

  const response = await httpRequest<DataEnvelope<ApiService>>(`/services/${id}`, {
    method: "PUT",
    body: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
      currency: input.currency,
      requiresResource: input.requiresResource,
      active: input.active,
      metadata: {
        imageUrl: input.imageUrl ?? null,
      },
    },
  });

  return mapApiServiceToItem(unwrapData<ApiService>(response));
}

export async function deleteService(id: string): Promise<void> {
  await httpRequest(`/services/${id}`, { method: "DELETE" });
}

export function toServicesFriendlyMessage(error: AppError): string {
  if (error.code === "VALIDATION_ERROR" && error.details && error.details.length > 0) {
    return error.details.map((d) => d.message).join(" ");
  }
  if (error.status === 402) {
    return "Límite de servicios alcanzado. Actualiza tu plan para crear más servicios.";
  }
  return error.message || "Ocurrió un error al gestionar el servicio.";
}
