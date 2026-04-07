export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  emailVerified?: boolean;
};

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

type SessionListener = (state: SessionState) => void;

const SESSION_STORAGE_KEY = "agendateya_admin_session";

function sanitizeUser(candidate: unknown): AuthUser | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const user = candidate as Record<string, unknown>;
  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.fullName !== "string" ||
    typeof user.role !== "string"
  ) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

function loadSessionState(): SessionState {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return {
        accessToken: null,
        refreshToken: null,
        user: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : null,
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : null,
      user: sanitizeUser(parsed.user),
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
}

function persistSessionState() {
  if (typeof window === "undefined") {
    return;
  }

  if (!state.accessToken && !state.refreshToken && !state.user) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}

const state: SessionState = loadSessionState();

const listeners = new Set<SessionListener>();

function emit() {
  for (const listener of listeners) {
    listener({ ...state });
  }
}

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export function getSessionState(): SessionState {
  return { ...state };
}

export function setSessionState(next: Partial<SessionState>) {
  if (next.accessToken !== undefined) {
    state.accessToken = next.accessToken;
  }
  if (next.refreshToken !== undefined) {
    state.refreshToken = next.refreshToken;
  }
  if (next.user !== undefined) {
    state.user = next.user;
  }
  persistSessionState();
  emit();
}

export function clearSessionState() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  persistSessionState();
  emit();
}

export function isAuthenticated() {
  return Boolean(state.accessToken);
}

// Onboarding token storage (temporary, sessionStorage only)
const ONBOARDING_TOKEN_KEY = "agendateya_onboarding_token";
const ONBOARDING_REFRESH_KEY = "agendateya_onboarding_refresh";

export function getOnboardingTokens(): { token: string | null; refresh: string | null } {
  if (typeof window === "undefined") {
    return { token: null, refresh: null };
  }
  return {
    token: window.sessionStorage.getItem(ONBOARDING_TOKEN_KEY),
    refresh: window.sessionStorage.getItem(ONBOARDING_REFRESH_KEY),
  };
}

export function setOnboardingTokens(token: string, refresh: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(ONBOARDING_TOKEN_KEY, token);
  window.sessionStorage.setItem(ONBOARDING_REFRESH_KEY, refresh);
}

export function clearOnboardingTokens() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(ONBOARDING_TOKEN_KEY);
  window.sessionStorage.removeItem(ONBOARDING_REFRESH_KEY);
}

// JWT decode helper (client-side, no verification)
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}
