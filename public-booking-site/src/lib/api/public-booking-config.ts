import type { PublicBookingConfig } from "../types/tenant-config";
import { parsePublicBookingConfigPayload } from "../contracts/booking-config-contract";

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE_URL ?? "";

function withDefaults(payload: Partial<PublicBookingConfig>, slug: string): PublicBookingConfig {
  return {
    slug,
    tenantName: payload.tenantName ?? "AgendateYA",
    published: payload.published ?? false,
    branding: {
      primaryColor: payload.branding?.primaryColor ?? "#0F172A",
      secondaryColor: payload.branding?.secondaryColor ?? "#1E293B",
      accentColor: payload.branding?.accentColor ?? "#0EA5E9",
      backgroundColor: payload.branding?.backgroundColor ?? "#FFFFFF",
      surfaceColor: payload.branding?.surfaceColor ?? "#F8FAFC",
      textColor: payload.branding?.textColor ?? "#111827",
      textSecondaryColor: payload.branding?.textSecondaryColor ?? "#6B7280",
      fontFamily: payload.branding?.fontFamily ?? "Poppins",
      customFontUrl: payload.branding?.customFontUrl ?? null,
      borderRadius: payload.branding?.borderRadius ?? "10px",
      logoUrl: payload.branding?.logoUrl ?? null,
      coverImageUrl: payload.branding?.coverImageUrl ?? null,
      faviconUrl: payload.branding?.faviconUrl ?? null,
    },
    services: payload.services ?? [],
    locations: payload.locations ?? [],
    resources: payload.resources ?? [],
  };
}

export async function fetchPublicBookingConfig(slug: string, fetchImpl: typeof fetch): Promise<PublicBookingConfig> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/booking-config`;

  const response = await fetchImpl(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Booking config request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const normalizedPayload = parsePublicBookingConfigPayload(payload);
  return withDefaults(normalizedPayload, slug);
}
