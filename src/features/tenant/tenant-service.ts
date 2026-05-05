import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  sitePublished: boolean;
  description?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  timezone?: string;
  businessType?: string;
  businessSubType?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionTrialEndsAt?: string;
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
  businessSubType?: string;
  description?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
};

export type PublishTenantSiteResult = {
  published: boolean;
  siteUrl?: string;
  warnings: string[];
};

type DataEnvelope<T> = { data: T };

type ApiTenant = {
  id: string;
  name: string;
  slug: string;
  sitePublished?: boolean | null;
  published?: boolean | null;
  description?: string | null;
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  timezone?: string | null;
  businessSubType?: string | null;
  businessType?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTrialEndsAt?: string | null;
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
    sitePublished: Boolean(api.sitePublished ?? api.published ?? false),
    description: api.description ?? undefined,
    tagline: api.tagline ?? undefined,
    contactEmail: api.contactEmail ?? undefined,
    contactPhone: api.contactPhone ?? undefined,
    websiteUrl: api.websiteUrl ?? undefined,
    instagramUrl: api.instagramUrl ?? undefined,
    facebookUrl: api.facebookUrl ?? undefined,
    youtubeUrl: api.youtubeUrl ?? undefined,
    timezone: api.timezone ?? undefined,
    businessType: api.businessType ?? undefined,
    businessSubType: api.businessSubType ?? undefined,
    subscriptionTier: api.subscriptionTier ?? undefined,
    subscriptionStatus: api.subscriptionStatus ?? undefined,
    subscriptionTrialEndsAt: api.subscriptionTrialEndsAt ?? undefined,
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

type PublishSiteApiResponse = {
  published?: boolean | null;
  siteUrl?: string | null;
  warnings?: unknown;
};

function mapWarnings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === "string");
}

export async function publishTenantSite(): Promise<PublishTenantSiteResult> {
  const response = await httpRequest<DataEnvelope<PublishSiteApiResponse>>("/tenant/site/publish", {
    method: "POST",
  });
  const data = unwrapData<PublishSiteApiResponse>(response);
  return {
    published: data.published ?? true,
    siteUrl: data.siteUrl ?? undefined,
    warnings: mapWarnings(data.warnings),
  };
}

export async function unpublishTenantSite(): Promise<PublishTenantSiteResult> {
  const response = await httpRequest<DataEnvelope<PublishSiteApiResponse>>("/tenant/site/unpublish", {
    method: "POST",
  });
  const data = unwrapData<PublishSiteApiResponse>(response);
  return {
    published: data.published ?? false,
    siteUrl: data.siteUrl ?? undefined,
    warnings: mapWarnings(data.warnings),
  };
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

  if (error.code === "PUBLISH_REQUIREMENTS_NOT_MET" && error.details) {
    return error.details.map((d) => d.message).join(" ");
  }

  return error.message ?? "Ocurrió un error inesperado.";
}

const TIER_ALIASES: Record<string, string> = {
  pro: "professional",
  ent: "enterprise",
};

export function normalizeTier(tier: string): string {
  const t = tier.toLowerCase();
  return TIER_ALIASES[t] ?? t;
}

export function getTierLabel(tier: string): string {
  const tierLabels: Record<string, string> = {
    free: "Gratuito",
    basic: "Básico",
    professional: "Profesional",
    enterprise: "Empresarial",
  };
  return tierLabels[normalizeTier(tier)] ?? tier;
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
