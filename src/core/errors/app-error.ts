export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BOOKING_CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "SUBSCRIPTION_LIMIT"
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
};

function normalizeDetails(details: unknown): AppErrorDetail[] | undefined {
  if (!details) {
    return undefined;
  }

  if (Array.isArray(details)) {
    return details
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => {
        const candidate = item as { field?: unknown; message?: unknown };
        return {
          field: typeof candidate.field === "string" ? candidate.field : undefined,
          message: typeof candidate.message === "string" ? candidate.message : "Validation error",
        };
      });
  }

  if (typeof details === "object") {
    return Object.entries(details as Record<string, unknown>)
      .filter(([, message]) => typeof message === "string")
      .map(([field, message]) => ({ field, message: message as string }));
  }

  return undefined;
}

export function toAppError(input: {
  status: number;
  code?: string;
  message?: string;
  details?: unknown;
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
    503: "SERVICE_UNAVAILABLE",
  };

  const code = (input.code as AppErrorCode | undefined) ?? fallbackByStatus[input.status] ?? "UNKNOWN_ERROR";

  return {
    code,
    message: input.message ?? "Unexpected error",
    status: input.status,
    details: normalizeDetails(input.details),
  };
}
