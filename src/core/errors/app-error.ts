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

export function toAppError(input: {
  status: number;
  code?: string;
  message?: string;
  details?: AppErrorDetail[];
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
    details: input.details,
  };
}
