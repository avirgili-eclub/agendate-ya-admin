import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import {
  setGoogleCalendarAlertStatus,
  type GoogleCalendarAlertStatus,
} from "@/features/calendar/google-calendar-alert";

export type GoogleCalendarAuthStatus = "NOT_CONNECTED" | "ACTIVE" | "NEEDS_REAUTH";

export type GoogleCalendarAuthStatusData = {
  connected: boolean;
  status: GoogleCalendarAuthStatus;
  connectedAt?: string;
};

type GoogleCalendarAuthUrlData = {
  authUrl: string;
};

export type GoogleCalendarConnection = {
  id?: string;
};

const GOOGLE_CALENDAR_ALLOWED_ROLES = new Set(["TENANT_ADMIN", "LOCATION_MANAGER"]);

export function canViewGoogleCalendarStatus(role: string | null | undefined) {
  return GOOGLE_CALENDAR_ALLOWED_ROLES.has((role ?? "").toUpperCase());
}

export function canManageGoogleCalendarConnection(role: string | null | undefined) {
  return (role ?? "").toUpperCase() === "TENANT_ADMIN";
}

function toAlertStatus(status: GoogleCalendarAuthStatus): GoogleCalendarAlertStatus {
  return status === "NEEDS_REAUTH" ? "NEEDS_REAUTH" : "NONE";
}

export async function fetchGoogleCalendarAuthStatus() {
  const response = await httpRequest<{ data: GoogleCalendarAuthStatusData }>("/calendar/auth-status", {
    method: "GET",
    timeoutMs: 8000,
  });

  return unwrapData<GoogleCalendarAuthStatusData>(response);
}

export async function fetchGoogleCalendarAuthUrl() {
  const response = await httpRequest<{ data: GoogleCalendarAuthUrlData }>("/calendar/auth-url", {
    method: "GET",
    timeoutMs: 8000,
  });

  return unwrapData<GoogleCalendarAuthUrlData>(response);
}

export async function disconnectGoogleCalendar() {
  await httpRequest<unknown>("/calendar/disconnect", {
    method: "DELETE",
    timeoutMs: 8000,
  });
  setGoogleCalendarAlertStatus("NONE");
}

export async function fetchGoogleCalendarConnections() {
  const response = await httpRequest<{ data: GoogleCalendarConnection[] }>("/calendar/connections", {
    method: "GET",
    timeoutMs: 8000,
  });

  return unwrapData<GoogleCalendarConnection[]>(response);
}

export async function runSilentGoogleCalendarStatusCheck(role: string | null | undefined) {
  if (!canViewGoogleCalendarStatus(role)) {
    return;
  }

  try {
    const status = await fetchGoogleCalendarAuthStatus();
    setGoogleCalendarAlertStatus(toAlertStatus(status.status));
  } catch {
    // Silent by design: calendar status cannot block login flow.
  }
}
