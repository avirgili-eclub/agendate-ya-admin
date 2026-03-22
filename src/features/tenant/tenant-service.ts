import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  timezone?: string;
  businessType?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  maxLocations?: number;
  maxResources?: number;
  maxUsers?: number;
  maxBookingsPerMonth?: number;
  currentLocations?: number;
  currentResources?: number;
  currentUsers?: number;
  currentBookingsThisMonth?: number;
  createdAt: string;
};

export type TenantUpdateInput = {
  name?: string;
  timezone?: string;
  businessType?: string;
};

type DataEnvelope<T> = { data: T };

type ApiTenant = {
  id: string;
  name: string;
  slug: string;
  timezone?: string | null;
  businessType?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  maxLocations?: number | null;
  maxResources?: number | null;
  maxUsers?: number | null;
  maxBookingsPerMonth?: number | null;
  currentLocations?: number | null;
  currentResources?: number | null;
  currentUsers?: number | null;
  currentBookingsThisMonth?: number | null;
  createdAt: string;
};

function mapApiTenantToInfo(api: ApiTenant): TenantInfo {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    timezone: api.timezone ?? undefined,
    businessType: api.businessType ?? undefined,
    subscriptionTier: api.subscriptionTier ?? undefined,
    subscriptionStatus: api.subscriptionStatus ?? undefined,
    maxLocations: api.maxLocations ?? undefined,
    maxResources: api.maxResources ?? undefined,
    maxUsers: api.maxUsers ?? undefined,
    maxBookingsPerMonth: api.maxBookingsPerMonth ?? undefined,
    currentLocations: api.currentLocations ?? undefined,
    currentResources: api.currentResources ?? undefined,
    currentUsers: api.currentUsers ?? undefined,
    currentBookingsThisMonth: api.currentBookingsThisMonth ?? undefined,
    createdAt: api.createdAt,
  };
}

export async function fetchTenantInfo(): Promise<TenantInfo> {
  const response = await httpRequest<DataEnvelope<ApiTenant>>("/tenant");
  return mapApiTenantToInfo(unwrapData<ApiTenant>(response));
}

export async function updateTenantInfo(input: TenantUpdateInput): Promise<TenantInfo> {
  const response = await httpRequest<DataEnvelope<ApiTenant>>("/tenant", {
    method: "PUT",
    body: input,
  });
  return mapApiTenantToInfo(unwrapData<ApiTenant>(response));
}

export function toTenantFriendlyMessage(error: AppError): string {
  if (error.code === "FORBIDDEN") {
    return "No tienes permisos para modificar esta información. Solo administradores pueden acceder.";
  }

  if (error.code === "NOT_FOUND") {
    return "No se encontró información del tenant.";
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(" ");
  }

  return error.message ?? "Ocurrió un error inesperado.";
}

export function getTierLabel(tier: string): string {
  const tierLabels: Record<string, string> = {
    free: "Gratuito",
    basic: "Básico",
    professional: "Profesional",
    enterprise: "Empresarial",
  };
  return tierLabels[tier.toLowerCase()] ?? tier;
}

export function getSubscriptionStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    active: "Activa",
    trialing: "Período de prueba",
    past_due: "Pago pendiente",
    canceled: "Cancelada",
    incomplete: "Incompleta",
  };
  return statusLabels[status.toLowerCase()] ?? status;
}
