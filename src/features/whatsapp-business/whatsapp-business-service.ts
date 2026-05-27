import { unwrapData, type DataEnvelope } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type { AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

const WHATSAPP_BUSINESS_BASE_PATH = "/integrations/whatsapp-business";

export const WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED =
  "WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED" as const;

export type WhatsappBusinessStatus =
  | "NOT_CONNECTED"
  | "DISCONNECTED"
  | "ACTIVE"
  | "CONNECTED"
  | "PENDING"
  | "ERROR"
  | "NEEDS_ATTENTION";

export type WhatsappBusinessStatusData = {
  connected: boolean;
  status: WhatsappBusinessStatus;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  displayName?: string;
};

export type WhatsappBusinessConfigInput = {
  phoneNumber: string;
  displayPhoneNumber?: string;
  displayName?: string;
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

const baseWhatsappBusinessErrorMapper = createErrorMapper({
  validationError: "Revisá los datos del número de WhatsApp Business.",
  fallback: "No pudimos procesar la integración de WhatsApp Business.",
});

export function toWhatsappBusinessFriendlyMessage(error: AppError): string {
  if (error.code === WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED) {
    return "Este número aún no está habilitado para tu cuenta. Escribinos para activarlo.";
  }

  return baseWhatsappBusinessErrorMapper(error);
}
