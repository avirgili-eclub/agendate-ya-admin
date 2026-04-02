import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";
import { createErrorMapper, extractFieldErrors } from "@/shared/utils/api-error-mapper";

export type LocationItem = {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  businessHoursSummary: string | null;
  businessHours?: {
    timezone: string;
    weekly: Array<{
      dayOfWeek: number;
      intervals: Array<{
        startTime: string;
        endTime: string;
      }>;
    }>;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocationBusinessHourIntervalInput = {
  startTime: string;
  endTime: string;
};

export type LocationBusinessHourDayInput = {
  dayOfWeek: number;
  intervals: LocationBusinessHourIntervalInput[];
};

export type LocationBusinessHoursInput = {
  timezone: string;
  weekly: LocationBusinessHourDayInput[];
};

export type LocationUpsertInput = {
  name: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  businessHours?: LocationBusinessHoursInput;
};

type DataEnvelope<T> = { data: T };

type ApiLocation = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  businessHoursSummary?: string | null;
  businessHours?: {
    timezone?: string | null;
    weekly?: Array<{
      dayOfWeek: number;
      intervals?: Array<{
        startTime: string;
        endTime: string;
      }> | null;
    }> | null;
  } | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapApiBusinessHours(
  api:
    | {
        timezone?: string | null;
        weekly?: Array<{
          dayOfWeek: number;
          intervals?: Array<{
            startTime: string;
            endTime: string;
          }> | null;
        }> | null;
      }
    | null
    | undefined,
): LocationItem["businessHours"] | undefined {
  if (!api || typeof api !== "object") {
    return undefined;
  }

  const timezone = typeof api.timezone === "string" && api.timezone.trim()
    ? api.timezone
    : "America/Asuncion";

  const weekly = Array.isArray(api.weekly)
    ? api.weekly.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        intervals: Array.isArray(day.intervals)
          ? day.intervals.filter(
              (interval): interval is { startTime: string; endTime: string } =>
                typeof interval?.startTime === "string" && typeof interval?.endTime === "string",
            )
          : [],
      }))
    : [];

  return {
    timezone,
    weekly,
  };
}

function mapApiLocationToItem(api: ApiLocation): LocationItem {
  return {
    id: api.id,
    tenantId: api.tenantId,
    name: api.name,
    address: api.address ?? undefined,
    phone: api.phone ?? undefined,
    imageUrl: api.imageUrl ?? undefined,
    metadata: api.metadata ?? undefined,
    businessHoursSummary:
      typeof api.businessHoursSummary === "string" && api.businessHoursSummary.trim()
        ? api.businessHoursSummary
        : null,
    businessHours: mapApiBusinessHours(api.businessHours),
    active: api.active,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function normalizeOptionalField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBusinessHoursInput(
  input: LocationBusinessHoursInput | undefined,
): LocationBusinessHoursInput | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const timezone = typeof input.timezone === "string" && input.timezone.trim()
    ? input.timezone.trim()
    : "America/Asuncion";

  const weeklyByDay = new Map<number, LocationBusinessHourDayInput>();

  for (const day of input.weekly ?? []) {
    if (!day || typeof day.dayOfWeek !== "number") {
      continue;
    }

    const normalizedDay = Math.max(0, Math.min(6, day.dayOfWeek));
    const intervals = Array.isArray(day.intervals)
      ? day.intervals
          .filter(
            (interval): interval is LocationBusinessHourIntervalInput =>
              typeof interval?.startTime === "string" &&
              interval.startTime.length > 0 &&
              typeof interval?.endTime === "string" &&
              interval.endTime.length > 0,
          )
          .map((interval) => ({
            startTime: interval.startTime,
            endTime: interval.endTime,
          }))
      : [];

    weeklyByDay.set(normalizedDay, {
      dayOfWeek: normalizedDay,
      intervals,
    });
  }

  const weekly = Array.from({ length: 7 }, (_, dayOfWeek) => {
    return weeklyByDay.get(dayOfWeek) ?? { dayOfWeek, intervals: [] };
  });

  return {
    timezone,
    weekly,
  };
}

function assertLocationInput(input: LocationUpsertInput) {
  if (!input.name.trim()) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Errores de validación",
      details: [{ field: "name", message: "El nombre de la sede es obligatorio." }],
    });
  }
}

function toUpsertPayload(input: LocationUpsertInput) {
  const businessHours = normalizeBusinessHoursInput(input.businessHours);

  return {
    name: input.name.trim(),
    address: normalizeOptionalField(input.address),
    phone: normalizeOptionalField(input.phone),
    imageUrl: normalizeOptionalField(input.imageUrl),
    businessHours,
  };
}

export async function fetchLocations(): Promise<LocationItem[]> {
  const response = await httpRequest<DataEnvelope<ApiLocation[]>>("/locations");
  return unwrapData<ApiLocation[]>(response).map(mapApiLocationToItem);
}

export async function createLocation(input: LocationUpsertInput): Promise<LocationItem> {
  assertLocationInput(input);
  const response = await httpRequest<DataEnvelope<ApiLocation>>("/locations", {
    method: "POST",
    body: toUpsertPayload(input),
  });
  return mapApiLocationToItem(unwrapData<ApiLocation>(response));
}

export async function updateLocation(id: string, input: LocationUpsertInput): Promise<LocationItem> {
  assertLocationInput(input);
  const response = await httpRequest<DataEnvelope<ApiLocation>>(`/locations/${id}`, {
    method: "PUT",
    body: toUpsertPayload(input),
  });
  return mapApiLocationToItem(unwrapData<ApiLocation>(response));
}

export async function deleteLocation(id: string): Promise<void> {
  await httpRequest(`/locations/${id}`, { method: "DELETE" });
}

const toLocationsBaseMessage = createErrorMapper({
  notFound: "La sede solicitada no existe o ya fue eliminada.",
  conflict: "No se puede completar la operación por dependencias activas en esta sede.",
  validationError: "Revisa los datos de la sede antes de continuar.",
  fallback: "No pudimos procesar la operación de sedes. Intenta nuevamente.",
});

export function toLocationsFriendlyMessage(error: AppError): string {
  if (error.status === 403 || error.code === "FORBIDDEN") {
    return "No tienes permisos para gestionar sedes.";
  }

  if (error.status === 400 && error.code !== "VALIDATION_ERROR") {
    return "No se puede eliminar esta sede porque tiene recursos o bookings asociados.";
  }

  return toLocationsBaseMessage(error);
}

export function processLocationFormError(error: AppError): {
  fieldErrors: Record<string, string>;
  formError: string;
} {
  return {
    fieldErrors: extractFieldErrors(error),
    formError: toLocationsFriendlyMessage(error),
  };
}