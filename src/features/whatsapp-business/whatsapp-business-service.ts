import { unwrapData, type DataEnvelope } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type { AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

const WHATSAPP_BUSINESS_BASE_PATH = "/integrations/whatsapp-business";

export const WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED =
  "WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED" as const;
export const WHATSAPP_ALREADY_CONNECTED = "WHATSAPP_ALREADY_CONNECTED" as const;
export const WHATSAPP_NOT_CONFIGURED = "WHATSAPP_NOT_CONFIGURED" as const;
export const INBOUND_WEBHOOK_REGISTRATION_FAILED = "INBOUND_WEBHOOK_REGISTRATION_FAILED" as const;

export const WHATSAPP_ONBOARDING_POLL_INTERVAL_MS = 2_000;
export const WHATSAPP_ONBOARDING_POLL_TIMEOUT_MS = 30_000;

export const WHATSAPP_INBOUND_WEBHOOK_POLL_INTERVAL_MS = 3_000;
export const WHATSAPP_INBOUND_WEBHOOK_POLL_TIMEOUT_MS = 30_000;

export type WhatsappBusinessStatus =
  | "NOT_CONNECTED"
  | "DISCONNECTED"
  | "ACTIVE"
  | "CONNECTED"
  | "PENDING"
  | "ERROR"
  | "NEEDS_ATTENTION";

export type InboundWebhookStatus =
  | "REGISTERED"
  | "PENDING"
  | "FAILED"
  | "NOT_REGISTERED";

export type WhatsappTemplateKey = "APPOINTMENT_REMINDER" | "SUBSCRIPTION_EXPIRING" | (string & {});

export type WhatsappTemplateStatus = "NOT_INITIATED" | "PENDING" | "APPROVED" | "REJECTED" | (string & {});

export type WhatsappTemplateStatusData = {
  templateKey: WhatsappTemplateKey;
  status: WhatsappTemplateStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
};

export type WhatsappBusinessStatusData = {
  connected: boolean;
  status: WhatsappBusinessStatus;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  displayName?: string;
  inboundWebhookStatus?: InboundWebhookStatus | null;
  templates?: WhatsappTemplateStatusData[];
};

export type WhatsappBusinessConfigInput = {
  phoneNumber: string;
  displayPhoneNumber?: string;
  displayName?: string;
};

export type StartWhatsappBusinessOnboardingResponse = {
  setupLinkUrl: string;
  expiresAt: string;
};

export type WhatsappBusinessStatusLabel =
  | "Activo"
  | "Pendiente"
  | "Sin conectar"
  | "Requiere atención";

export type WhatsappBusinessStatusTone = "success" | "warning" | "muted" | "danger";

export const whatsappBusinessKeys = {
  all: ["whatsapp-business"] as const,
  status: () => [...whatsappBusinessKeys.all, "status"] as const,
};

const WHATSAPP_BUSINESS_ALLOWED_VIEW_ROLES = new Set(["TENANT_ADMIN", "LOCATION_MANAGER"]);

export function canViewWhatsappBusinessStatus(role: string | null | undefined) {
  return WHATSAPP_BUSINESS_ALLOWED_VIEW_ROLES.has((role ?? "").toUpperCase());
}

export function canManageWhatsappBusinessConnection(role: string | null | undefined) {
  return (role ?? "").toUpperCase() === "TENANT_ADMIN";
}

export function needsInboundRetry(status: WhatsappBusinessStatusData | undefined): boolean {
  if (!status) return false;
  if (!status.connected) return false;
  const webhookStatus = status.inboundWebhookStatus;
  return webhookStatus === "FAILED" || webhookStatus === "NOT_REGISTERED";
}

export function getWhatsappBusinessStatusLabel(
  status: WhatsappBusinessStatus,
): WhatsappBusinessStatusLabel {
  if (status === "ACTIVE" || status === "CONNECTED") {
    return "Activo";
  }

  if (status === "PENDING") {
    return "Pendiente";
  }

  if (status === "ERROR" || status === "NEEDS_ATTENTION") {
    return "Requiere atención";
  }

  return "Sin conectar";
}

export function getWhatsappBusinessStatusTone(
  status: WhatsappBusinessStatus,
): WhatsappBusinessStatusTone {
  if (status === "ACTIVE" || status === "CONNECTED") {
    return "success";
  }

  if (status === "PENDING") {
    return "warning";
  }

  if (status === "ERROR" || status === "NEEDS_ATTENTION") {
    return "danger";
  }

  return "muted";
}

export function getWhatsappBusinessCapabilityLabels(status: WhatsappBusinessStatusData): string[] {
  const labels: string[] = [];

  if (status.inboundEnabled) {
    labels.push("Recepción de mensajes activa");
  }

  if (status.outboundEnabled) {
    labels.push("Envío de mensajes activo");
  }

  return labels;
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toConfigurePayload(input: WhatsappBusinessConfigInput) {
  return {
    phoneNumber: input.phoneNumber.trim(),
    displayPhoneNumber: trimOptional(input.displayPhoneNumber),
    displayName: trimOptional(input.displayName),
  };
}

export async function fetchWhatsappBusinessStatus(): Promise<WhatsappBusinessStatusData> {
  const response = await httpRequest<DataEnvelope<WhatsappBusinessStatusData>>(
    `${WHATSAPP_BUSINESS_BASE_PATH}/status`,
    {
      method: "GET",
      timeoutMs: 8000,
    },
  );

  return unwrapData<WhatsappBusinessStatusData>(response);
}

export async function startWhatsappBusinessOnboarding(): Promise<StartWhatsappBusinessOnboardingResponse> {
  const response = await httpRequest<DataEnvelope<StartWhatsappBusinessOnboardingResponse>>(
    `${WHATSAPP_BUSINESS_BASE_PATH}/onboarding/start`,
    {
      method: "POST",
      timeoutMs: 8000,
    },
  );

  return unwrapData<StartWhatsappBusinessOnboardingResponse>(response);
}

export async function configureWhatsappBusinessNumber(
  input: WhatsappBusinessConfigInput,
): Promise<WhatsappBusinessStatusData> {
  const response = await httpRequest<DataEnvelope<WhatsappBusinessStatusData>>(
    `${WHATSAPP_BUSINESS_BASE_PATH}/number`,
    {
      method: "PUT",
      body: toConfigurePayload(input),
      timeoutMs: 8000,
    },
  );

  return unwrapData<WhatsappBusinessStatusData>(response);
}

export async function disconnectWhatsappBusiness(): Promise<void> {
  await httpRequest<unknown>(WHATSAPP_BUSINESS_BASE_PATH, {
    method: "DELETE",
    timeoutMs: 8000,
  });
}

export async function retryInboundWebhook(): Promise<WhatsappBusinessStatusData> {
  const response = await httpRequest<DataEnvelope<WhatsappBusinessStatusData>>(
    `${WHATSAPP_BUSINESS_BASE_PATH}/inbound-webhook/retry`,
    {
      method: "POST",
      timeoutMs: 8000,
    },
  );

  return unwrapData<WhatsappBusinessStatusData>(response);
}

const baseWhatsappBusinessErrorMapper = createErrorMapper({
  validationError: "Revisá los datos del número de WhatsApp Business.",
  fallback: "No pudimos procesar la integración de WhatsApp Business.",
});

export function toWhatsappBusinessFriendlyMessage(error: AppError): string {
  if (error.status === 402 || error.code === "PAYMENT_REQUIRED" || error.code === "SUBSCRIPTION_LIMIT") {
    return "Tu plan actual no incluye WhatsApp Business. Actualizá tu suscripción para activarlo.";
  }

  if (error.code === WHATSAPP_ALREADY_CONNECTED) {
    return "La cuenta de WhatsApp Business ya está conectada. Estamos actualizando el estado.";
  }

  if (error.code === WHATSAPP_NOT_CONFIGURED) {
    return "No hay número activo para reintentar";
  }

  if (error.code === INBOUND_WEBHOOK_REGISTRATION_FAILED) {
    const detail = error.message || "Error desconocido";
    const truncated = detail.length > 200 ? detail.substring(0, 200) + "..." : detail;
    return `No se pudo configurar la recepción de mensajes. Detalle: ${truncated}. Si persiste, contactanos.`;
  }

  if (error.status === 502 || error.code === "SERVICE_UNAVAILABLE") {
    return "WhatsApp Business no está disponible en este momento. Intentá de nuevo más tarde.";
  }

  if (error.code === WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED) {
    return "Este número aún no está habilitado para tu cuenta. Escribinos para activarlo.";
  }

  return baseWhatsappBusinessErrorMapper(error);
}
