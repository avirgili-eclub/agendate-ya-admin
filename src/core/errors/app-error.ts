export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PUBLISH_REQUIREMENTS_NOT_MET"
  | "RATE_LIMIT_EXCEEDED"
  | "BOOKING_CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "SUBSCRIPTION_LIMIT"
  | "RESOURCE_NOT_ASSIGNED"
  | "RESOURCE_ACCESS_DENIED"
  | "RESOURCE_CALENDAR_NOT_CREATED"
  | "GOOGLE_CALENDAR_NOT_CONNECTED"
  | "GOOGLE_CALENDAR_NEEDS_REAUTH"
  | "CALENDAR_SYNC_RATE_LIMITED"
  | "INVALID_PARAMETER"
  | "REQUEST_TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export type AppErrorDetail = {
  field?: string;
  message: string;
};

export type AppError = {
  code: AppErrorCode;
  message: string;
  status: number;
  details?: AppErrorDetail[];
  retryAfterSeconds?: number;
};

function normalizeErrorCode(rawCode: string | undefined): AppErrorCode | undefined {
  if (!rawCode) {
    return undefined;
  }

  const normalized = rawCode.toUpperCase().replace(/\s+/g, "_");

  if (normalized.includes("BOOKING_CONFLICT") || normalized.includes("_CONFLICT")) {
    return "BOOKING_CONFLICT";
  }
  if (normalized.includes("INVALID_STATE_TRANSITION")) {
    return "INVALID_STATE_TRANSITION";
  }
  if (normalized.includes("VALIDATION_ERROR")) {
    return "VALIDATION_ERROR";
  }
  if (normalized.includes("UNAUTHORIZED")) {
    return "UNAUTHORIZED";
  }
  if (normalized.includes("FORBIDDEN")) {
    return "FORBIDDEN";
  }
  if (normalized.includes("NOT_FOUND")) {
    return "NOT_FOUND";
  }
  if (normalized.includes("PUBLISH_REQUIREMENTS_NOT_MET")) {
    return "PUBLISH_REQUIREMENTS_NOT_MET";
  }
  if (normalized.includes("RATE_LIMIT_EXCEEDED") || normalized.includes("TOO_MANY_REQUESTS")) {
    return "RATE_LIMIT_EXCEEDED";
  }
  if (normalized.includes("SUBSCRIPTION_LIMIT")) {
    return "SUBSCRIPTION_LIMIT";
  }
  if (normalized.includes("RESOURCE_NOT_ASSIGNED")) {
    return "RESOURCE_NOT_ASSIGNED";
  }
  if (normalized.includes("RESOURCE_ACCESS_DENIED")) {
    return "RESOURCE_ACCESS_DENIED";
  }
  if (normalized.includes("RESOURCE_CALENDAR_NOT_CREATED")) {
    return "RESOURCE_CALENDAR_NOT_CREATED";
  }
  if (normalized.includes("GOOGLE_CALENDAR_NOT_CONNECTED")) {
    return "GOOGLE_CALENDAR_NOT_CONNECTED";
  }
  if (normalized.includes("GOOGLE_CALENDAR_NEEDS_REAUTH")) {
    return "GOOGLE_CALENDAR_NEEDS_REAUTH";
  }
  if (normalized.includes("CALENDAR_SYNC_RATE_LIMITED")) {
    return "CALENDAR_SYNC_RATE_LIMITED";
  }
  if (normalized.includes("INVALID_PARAMETER")) {
    return "INVALID_PARAMETER";
  }
  if (normalized.includes("REQUEST_TIMEOUT")) {
    return "REQUEST_TIMEOUT";
  }
  if (normalized.includes("SERVICE_UNAVAILABLE")) {
    return "SERVICE_UNAVAILABLE";
  }

  return undefined;
}

function normalizeDetails(details: unknown): AppErrorDetail[] | undefined {
  if (!details) {
    return undefined;
  }

  if (Array.isArray(details)) {
    return details
      .filter((item) =>
        (typeof item === "object" && item !== null) ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
      )
      .map((item) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return { message: String(item) };
        }
        const candidate = item as { field?: unknown; message?: unknown };
        return {
          field: typeof candidate.field === "string" ? candidate.field : undefined,
          message: typeof candidate.message === "string" ? candidate.message : "Validation error",
        };
      });
  }

  if (typeof details === "object") {
    return Object.entries(details as Record<string, unknown>)
      .filter(([, message]) =>
        typeof message === "string" ||
        typeof message === "number" ||
        typeof message === "boolean",
      )
      .map(([field, message]) => ({ field, message: String(message) }));
  }

  return undefined;
}

export function toAppError(input: {
  status: number;
  code?: string;
  message?: string;
  details?: unknown;
  retryAfterSeconds?: number;
}): AppError {
  const fallbackByStatus: Record<number, AppErrorCode> = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    402: "SUBSCRIPTION_LIMIT",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    408: "REQUEST_TIMEOUT",
    409: "BOOKING_CONFLICT",
    422: "INVALID_STATE_TRANSITION",
    429: "RATE_LIMIT_EXCEEDED",
    503: "SERVICE_UNAVAILABLE",
  };

  const code = normalizeErrorCode(input.code) ?? fallbackByStatus[input.status] ?? "UNKNOWN_ERROR";

  return {
    code,
    message: input.message ?? "Unexpected error",
    status: input.status,
    details: normalizeDetails(input.details),
    retryAfterSeconds: input.retryAfterSeconds,
  };
}
