import { unwrapData } from "@/core/api/envelope";
import { httpRequest, setAuthSessionHandlers } from "@/core/api/http-client";
import {
  clearSessionState,
  getSessionState,
  setSessionState,
  type AuthUser,
  getOnboardingTokens,
  clearOnboardingTokens,
  decodeJwt,
} from "./session-store";

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

type RegisterRequest = {
  business: {
    name: string;
    businessType: "SERVICE" | "HOSPITALITY";
    timezone: string;
    slug?: string;
  };
  location: {
    name: string;
    address: string;
    phone: string;
  };
  admin: {
    email: string;
    password: string;
    fullName: string;
  };
};

type RegisterResponseData = LoginResponseData & {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
};

type OnboardingCompleteRequest = {
  business: {
    name: string;
    businessType: "SERVICE" | "HOSPITALITY";
    timezone: string;
    slug?: string;
  };
  location: {
    name: string;
    address: string;
    phone: string;
  };
};

type OnboardingCompleteResponseData = RegisterResponseData;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function withResourceIdFromToken(user: AuthUser, accessToken: string): AuthUser {
  if (user.resourceId) {
    return user;
  }

  const payload = decodeJwt(accessToken);
  const rid = typeof payload?.rid === "string" ? payload.rid : undefined;

  return {
    ...user,
    resourceId: rid,
  };
}

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
    user: withResourceIdFromToken(data.user, data.accessToken),
  });

  return data;
}

export async function logout() {
  clearSessionState();
}

export async function register(payload: RegisterRequest) {
  const response = await httpRequest<{ data: RegisterResponseData }>("/auth/register", {
    method: "POST",
    body: payload,
    timeoutMs: 8000,
    skipAuth: true,
    skipAuthRefresh: true,
  });

  const data = unwrapData<RegisterResponseData>(response);
  setSessionState({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: withResourceIdFromToken(data.user, data.accessToken),
  });

  return data;
}

export function configureAuthHandlers(onSessionExpired: () => void) {
  setAuthSessionHandlers({
    getAccessToken: () => getSessionState().accessToken,
    refreshSession: refreshAccessToken,
    onSessionExpired,
  });
}

// Google OAuth
export function startGoogleLogin(returnUrl: string = "/dashboard") {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
  const fullUrl = apiBaseUrl.replace("/api/v1", ""); // Remove /api/v1 suffix if present
  const safeReturnUrl = returnUrl.startsWith("/") ? returnUrl : "/dashboard";
  const callbackUrl = `/auth/callback?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
  const googleLoginUrl = `${fullUrl}/api/v1/auth/google/login?returnUrl=${encodeURIComponent(callbackUrl)}`;
  window.location.href = googleLoginUrl;
}

// Onboarding complete (for Google users with onboarding_pending=true)
export async function completeOnboarding(payload: OnboardingCompleteRequest) {
  const { token } = getOnboardingTokens();
  if (!token) {
    throw new Error("No onboarding token found");
  }

  const response = await httpRequest<{ data: OnboardingCompleteResponseData }>(
    "/auth/onboarding/complete",
    {
      method: "POST",
      body: payload,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeoutMs: 8000,
      skipAuth: true,
      skipAuthRefresh: true,
    },
  );

  const data = unwrapData<OnboardingCompleteResponseData>(response);

  // Clear onboarding tokens
  clearOnboardingTokens();

  // Set full session
  setSessionState({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: withResourceIdFromToken(data.user, data.accessToken),
  });

  return data;
}

// Email confirmation
export async function confirmEmail(token: string) {
  const response = await httpRequest<{ data: { message: string } }>(
    `/auth/confirm-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      skipAuth: true,
      skipAuthRefresh: true,
      timeoutMs: 8000,
    },
  );

  return unwrapData<{ message: string }>(response);
}

// Resend confirmation email
export async function resendConfirmation(email: string) {
  const response = await httpRequest<{ data: { message: string } }>("/auth/resend-confirmation", {
    method: "POST",
    body: { email },
    skipAuth: true,
    skipAuthRefresh: true,
    timeoutMs: 8000,
  });

  return unwrapData<{ message: string }>(response);
}

// Forgot password
export async function forgotPassword(email: string) {
  const response = await httpRequest<{ data: { message: string } }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
    skipAuthRefresh: true,
    timeoutMs: 8000,
  });

  return unwrapData<{ message: string }>(response);
}

// Reset password
export async function resetPassword(token: string, newPassword: string) {
  const response = await httpRequest<{ data: { message: string } }>("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
    skipAuth: true,
    skipAuthRefresh: true,
    timeoutMs: 8000,
  });

  return unwrapData<{ message: string }>(response);
}
