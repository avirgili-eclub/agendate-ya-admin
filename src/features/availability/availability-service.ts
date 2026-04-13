import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

export type AvailabilityRule = {
  id: string;
  resourceId: string;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday (ISO convention)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  validFrom?: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
};

export type AvailabilityOverride = {
  id: string;
  resourceId: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
};

export type CreateRuleInput = {
  resourceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom?: string;
  validUntil?: string;
};

export type ReplaceAvailabilityRulesInput = {
  rules: CreateRuleInput[];
};

export type CreateOverrideInput = {
  resourceId: string;
  date: string;
  available: boolean;
  startTime?: string;
  endTime?: string;
};

type DataEnvelope<T> = { data: T };

type ApiRule = {
  id: string;
  resourceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom?: string | null;
  validUntil?: string | null;
};

type ApiOverride = {
  id: string;
  resourceId: string;
  date: string;
  available: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

function mapApiRuleToRule(api: ApiRule): AvailabilityRule {
  return {
    id: api.id,
    resourceId: api.resourceId,
    dayOfWeek: api.dayOfWeek,
    startTime: api.startTime,
    endTime: api.endTime,
    validFrom: api.validFrom ?? undefined,
    validUntil: api.validUntil ?? undefined,
  };
}

function mapApiOverrideToOverride(api: ApiOverride): AvailabilityOverride {
  return {
    id: api.id,
    resourceId: api.resourceId,
    date: api.date,
    available: api.available,
    startTime: api.startTime ?? undefined,
    endTime: api.endTime ?? undefined,
  };
}

function assertRuleInput(input: CreateRuleInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.resourceId.trim()) {
    details.push({ field: "resourceId", message: "Debes seleccionar un recurso." });
  }
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    details.push({ field: "dayOfWeek", message: "Día de la semana inválido (0-6)." });
  }
  if (!input.startTime.trim()) {
    details.push({ field: "startTime", message: "La hora de inicio es obligatoria." });
  }
  if (!input.endTime.trim()) {
    details.push({ field: "endTime", message: "La hora de fin es obligatoria." });
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

function normalizeTimeForApi(value: string): string {
  // HTML time inputs usually return HH:mm, backend expects LocalTime HH:mm:ss.
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }
  return value;
}

function assertOverrideInput(input: CreateOverrideInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.resourceId.trim()) {
    details.push({ field: "resourceId", message: "Debes seleccionar un recurso." });
  }
  if (!input.date.trim()) {
    details.push({ field: "date", message: "La fecha es obligatoria." });
  }
  if (input.available && (!input.startTime || !input.endTime)) {
    details.push({ field: "startTime", message: "Debes especificar horario para días disponibles." });
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

// Availability Rules
export async function fetchAvailabilityRules(resourceId: string): Promise<AvailabilityRule[]> {
  const response = await httpRequest<DataEnvelope<ApiRule[]>>(`/resources/${resourceId}/availability-rules`);
  return unwrapData<ApiRule[]>(response).map(mapApiRuleToRule);
}

export async function createAvailabilityRule(input: CreateRuleInput): Promise<AvailabilityRule> {
  assertRuleInput(input);

  const response = await httpRequest<DataEnvelope<ApiRule>>(
    `/resources/${input.resourceId}/availability-rules`,
    {
      method: "POST",
      body: {
        resourceId: input.resourceId,
        dayOfWeek: input.dayOfWeek,
        startTime: normalizeTimeForApi(input.startTime),
        endTime: normalizeTimeForApi(input.endTime),
        validFrom: input.validFrom || null,
        validUntil: input.validUntil || null,
      },
    },
  );

  return mapApiRuleToRule(unwrapData<ApiRule>(response));
}

export async function updateAvailabilityRule(
  id: string,
  input: Partial<CreateRuleInput>,
): Promise<AvailabilityRule> {
  const response = await httpRequest<DataEnvelope<ApiRule>>(`/availability-rules/${id}`, {
    method: "PUT",
    body: {
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      validFrom: input.validFrom || null,
      validUntil: input.validUntil || null,
    },
  });

  return mapApiRuleToRule(unwrapData<ApiRule>(response));
}

export async function deleteAvailabilityRule(id: string): Promise<void> {
  await httpRequest(`/availability-rules/${id}`, { method: "DELETE" });
}

export async function replaceAvailabilityRules(
  resourceId: string,
  input: ReplaceAvailabilityRulesInput,
): Promise<AvailabilityRule[]> {
  const normalizedRules = input.rules.map((rule) => {
    assertRuleInput(rule);
    return {
      resourceId: rule.resourceId,
      dayOfWeek: rule.dayOfWeek,
      startTime: normalizeTimeForApi(rule.startTime),
      endTime: normalizeTimeForApi(rule.endTime),
      validFrom: rule.validFrom || null,
      validUntil: rule.validUntil || null,
    };
  });

  const response = await httpRequest<DataEnvelope<ApiRule[]>>(
    `/resources/${resourceId}/availability-rules`,
    {
      method: "PUT",
      body: {
        rules: normalizedRules,
      },
    },
  );

  return unwrapData<ApiRule[]>(response).map(mapApiRuleToRule);
}

// Availability Overrides
export async function fetchAvailabilityOverrides(resourceId: string): Promise<AvailabilityOverride[]> {
  const response = await httpRequest<DataEnvelope<ApiOverride[]>>(
    `/resources/${resourceId}/availability-overrides`,
  );
  return unwrapData<ApiOverride[]>(response).map(mapApiOverrideToOverride);
}

export async function createAvailabilityOverride(input: CreateOverrideInput): Promise<AvailabilityOverride> {
  assertOverrideInput(input);

  const response = await httpRequest<DataEnvelope<ApiOverride>>(
    `/resources/${input.resourceId}/availability-overrides`,
    {
      method: "POST",
      body: {
        resourceId: input.resourceId,
        date: input.date,
        available: input.available,
        startTime: input.available ? input.startTime : null,
        endTime: input.available ? input.endTime : null,
      },
    },
  );

  return mapApiOverrideToOverride(unwrapData<ApiOverride>(response));
}

export async function updateAvailabilityOverride(
  id: string,
  input: Partial<CreateOverrideInput>,
): Promise<AvailabilityOverride> {
  const response = await httpRequest<DataEnvelope<ApiOverride>>(`/availability-overrides/${id}`, {
    method: "PUT",
    body: {
      available: input.available,
      startTime: input.available ? input.startTime : null,
      endTime: input.available ? input.endTime : null,
    },
  });

  return mapApiOverrideToOverride(unwrapData<ApiOverride>(response));
}

export async function deleteAvailabilityOverride(id: string): Promise<void> {
  await httpRequest(`/availability-overrides/${id}`, { method: "DELETE" });
}

/**
 * Availability-specific error message mapper.
 * Uses the reusable createErrorMapper helper with module-specific overrides.
 */
export const toAvailabilityFriendlyMessage = createErrorMapper({
  notFound: "Regla de disponibilidad no encontrada.",
  fallback: "Ocurrió un error al gestionar la disponibilidad.",
});

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
