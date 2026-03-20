import { unwrapData } from "@/core/api/envelope";
import { httpRequest, setAuthSessionHandlers } from "@/core/api/http-client";
import { clearSessionState, getSessionState, setSessionState, type AuthUser } from "./session-store";

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponseData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

type RefreshResponseData = {
  accessToken: string;
  expiresIn: number;
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const session = getSessionState();
  if (!session.refreshToken) {
    return null;
  }

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await httpRequest<{ data: RefreshResponseData }>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.refreshToken },
        timeoutMs: 8000,
        skipAuthRefresh: true,
      });

      const data = unwrapData<RefreshResponseData>(response);
      setSessionState({ accessToken: data.accessToken });
      return data.accessToken;
    } catch {
      clearSessionState();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function login(payload: LoginRequest) {
  if (import.meta.env.DEV && payload.email === "admin@admin.com" && payload.password === "admin123") {
    const devUser: AuthUser = {
      id: "dev-admin",
      email: "admin@admin.com",
      fullName: "Admin Local",
      role: "TENANT_ADMIN",
    };

    setSessionState({
      accessToken: "dev-access-token",
      refreshToken: "dev-refresh-token",
      user: devUser,
    });

    return {
      accessToken: "dev-access-token",
      refreshToken: "dev-refresh-token",
      expiresIn: 900,
      user: devUser,
    };
  }

  const response = await httpRequest<{ data: LoginResponseData }>("/auth/login", {
    method: "POST",
    body: payload,
    timeoutMs: 8000,
    skipAuthRefresh: true,
  });

  const data = unwrapData<LoginResponseData>(response);
  setSessionState({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  });

  return data;
}

export async function logout() {
  clearSessionState();
}

export function configureAuthHandlers(onSessionExpired: () => void) {
  setAuthSessionHandlers({
    getAccessToken: () => getSessionState().accessToken,
    refreshSession: refreshAccessToken,
    onSessionExpired,
  });
}
