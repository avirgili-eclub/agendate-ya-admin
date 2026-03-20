export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

type SessionListener = (state: SessionState) => void;

const state: SessionState = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

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
  emit();
}

export function clearSessionState() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  emit();
}

export function isAuthenticated() {
  return Boolean(state.accessToken);
}
