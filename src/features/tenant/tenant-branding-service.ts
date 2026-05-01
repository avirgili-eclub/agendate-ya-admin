import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type { AppError } from "@/core/errors/app-error";

export type TenantBranding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  fontFamily: string;
  customFontUrl: string | null;
  borderRadius: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  faviconUrl: null;
};

export type TenantBrandingUpdateInput = {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  fontFamily?: string;
  customFontUrl?: string | null;
  borderRadius?: string;
};

export type BookingConfig = {
  slug: string;
  tenantName: string;
  published: boolean;
  branding: TenantBranding;
  services: unknown[];
  resources: unknown[];
  locations: unknown[];
};

export const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: "#1A365D",
  secondaryColor: "#FF6B35",
  accentColor: "#FF6B35",
  backgroundColor: "#FBF9F6",
  surfaceColor: "#FFFFFF",
  textColor: "#0F1A2E",
  textSecondaryColor: "#5B6779",
  fontFamily: "Inter",
  customFontUrl: null,
  borderRadius: "14px",
  logoUrl: null,
  coverImageUrl: null,
  faviconUrl: null,
};

export const FONT_FAMILY_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Manrope", label: "Manrope" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Nunito", label: "Nunito" },
  { value: "Poppins", label: "Poppins" },
  { value: "Raleway", label: "Raleway" },
  { value: "DM Sans", label: "DM Sans" },
];

export const BORDER_RADIUS_OPTIONS = [
  { value: "0px", label: "Cuadrado" },
  { value: "4px", label: "Suave" },
  { value: "8px", label: "Redondeado" },
  { value: "12px", label: "Más redondeado" },
  { value: "14px", label: "Moderno" },
  { value: "20px", label: "Curvo" },
  { value: "999px", label: "Píldora" },
];

type ApiTenantBranding = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  surfaceColor?: string | null;
  textColor?: string | null;
  textSecondaryColor?: string | null;
  fontFamily?: string | null;
  customFontUrl?: string | null;
  borderRadius?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  faviconUrl?: null;
};

function mapApiToBranding(api: ApiTenantBranding): TenantBranding {
  return {
    primaryColor: api.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: api.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    accentColor: api.accentColor ?? DEFAULT_BRANDING.accentColor,
    backgroundColor: api.backgroundColor ?? DEFAULT_BRANDING.backgroundColor,
    surfaceColor: api.surfaceColor ?? DEFAULT_BRANDING.surfaceColor,
    textColor: api.textColor ?? DEFAULT_BRANDING.textColor,
    textSecondaryColor: api.textSecondaryColor ?? DEFAULT_BRANDING.textSecondaryColor,
    fontFamily: api.fontFamily ?? DEFAULT_BRANDING.fontFamily,
    customFontUrl: api.customFontUrl ?? null,
    borderRadius: api.borderRadius ?? DEFAULT_BRANDING.borderRadius,
    logoUrl: api.logoUrl ?? null,
    coverImageUrl: api.coverImageUrl ?? api.coverUrl ?? null,
    faviconUrl: null,
  };
}

type DataEnvelope<T> = { data: T };
type UploadLogoResponse =
  | DataEnvelope<ApiTenantBranding>
  | {
      logoUrl?: string | null;
    };
type UploadCoverResponse =
  | DataEnvelope<ApiTenantBranding>
  | {
      coverImageUrl?: string | null;
      coverUrl?: string | null;
    };

export async function fetchTenantBranding(): Promise<TenantBranding> {
  const response = await httpRequest<DataEnvelope<ApiTenantBranding>>("/tenant/branding");
  return mapApiToBranding(unwrapData<ApiTenantBranding>(response));
}

export async function updateTenantBranding(input: TenantBrandingUpdateInput): Promise<TenantBranding> {
  const response = await httpRequest<DataEnvelope<ApiTenantBranding>>("/tenant/branding", {
    method: "PUT",
    body: input,
  });
  return mapApiToBranding(unwrapData<ApiTenantBranding>(response));
}

export async function uploadBrandingLogo(file: File): Promise<{ logoUrl: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpRequest<UploadLogoResponse>("/tenant/branding/upload/logo", {
    method: "POST",
    body: formData,
  });
  if ("data" in response) {
    return { logoUrl: mapApiToBranding(unwrapData<ApiTenantBranding>(response)).logoUrl };
  }
  return { logoUrl: response.logoUrl ?? null };
}

export async function uploadBrandingCover(file: File): Promise<{ coverImageUrl: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await httpRequest<UploadCoverResponse>("/tenant/branding/upload/cover", {
    method: "POST",
    body: formData,
  });
  if ("data" in response) {
    return { coverImageUrl: mapApiToBranding(unwrapData<ApiTenantBranding>(response)).coverImageUrl };
  }
  return { coverImageUrl: response.coverImageUrl ?? response.coverUrl ?? null };
}

export type PreviewTokenResponse = {
  token: string;
  expiresAt: string;
};

export async function fetchPreviewToken(): Promise<PreviewTokenResponse> {
  const response = await httpRequest<DataEnvelope<PreviewTokenResponse>>("/admin/tenants/preview-token", {
    method: "POST",
  });
  return unwrapData<PreviewTokenResponse>(response);
}

export type SuggestedColors = {
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
};

export async function suggestBrandingColors(input: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): Promise<SuggestedColors> {
  return httpRequest<SuggestedColors>("/tenant/branding/suggest-colors", {
    method: "POST",
    body: input,
  });
}

export function toBrandingFriendlyMessage(error: AppError): string {
  if (error.code === "FORBIDDEN") {
    return "No tenés permisos para modificar el branding. Solo administradores pueden hacerlo.";
  }
  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(" ");
  }
  if (error.status === 413) {
    return "La imagen es demasiado grande. El tamaño máximo permitido es 5MB.";
  }
  if (error.status === 415) {
    return "Formato de imagen no soportado. Usá JPG, PNG o WebP.";
  }
  return error.message ?? "Ocurrió un error inesperado.";
}
