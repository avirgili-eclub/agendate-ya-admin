import type { AppError } from "@/core/errors/app-error";
import { toAppError } from "@/core/errors/app-error";
import type { ErrorEnvelope } from "./envelope";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
};

type AuthSessionHandlers = {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  onSessionExpired: () => void;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
let authHandlers: AuthSessionHandlers | null = null;

export function setAuthSessionHandlers(handlers: AuthSessionHandlers) {
  authHandlers = handlers;
}

function normalizeNetworkError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return toAppError({
      status: 408,
      code: "REQUEST_TIMEOUT",
      message: "El servicio no se encuentra disponible. Vuelve a intentarlo mas tarde.",
    });
  }

  return toAppError({
    status: 503,
    code: "SERVICE_UNAVAILABLE",
    message: "El servicio no se encuentra disponible. Vuelve a intentarlo mas tarde.",
  });
}

function createRequestSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined) {
  if (!timeoutMs) {
    return { signal, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function parseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function httpRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const accessToken = !options.skipAuth && authHandlers ? authHandlers.getAccessToken() : null;
  const makeRequest = async (bearerToken?: string | null) => {
    const requestSignal = createRequestSignal(options.signal, options.timeoutMs);
    return fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: requestSignal.signal,
    }).finally(requestSignal.cleanup);
  };

  let response: Response;
  try {
    response = await makeRequest(accessToken);
  } catch (error) {
    throw normalizeNetworkError(error);
  }

  let parsed = await parseBody(response);

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !options.skipAuth &&
    authHandlers
  ) {
    const refreshedToken = await authHandlers.refreshSession();
    if (refreshedToken) {
      try {
        response = await makeRequest(refreshedToken);
      } catch (error) {
        throw normalizeNetworkError(error);
      }
      parsed = await parseBody(response);
    } else {
      authHandlers.onSessionExpired();
    }
  }

  if (!response.ok) {
    const envelope = (parsed ?? {}) as ErrorEnvelope;
    const error: AppError = toAppError({
      status: response.status,
      code: envelope.error?.code,
      message: envelope.error?.message,
      details: envelope.error?.details,
    });
    throw error;
  }

  return parsed as TResponse;
}
