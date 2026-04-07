export type GoogleCalendarAlertStatus = "NONE" | "NEEDS_REAUTH";

const GOOGLE_CALENDAR_ALERT_STORAGE_KEY = "agendateya_google_calendar_alert_status";
const GOOGLE_CALENDAR_ALERT_EVENT = "agendateya:google-calendar-alert-changed";

function readFromStorage(): GoogleCalendarAlertStatus {
  if (typeof window === "undefined") {
    return "NONE";
  }

  const value = window.sessionStorage.getItem(GOOGLE_CALENDAR_ALERT_STORAGE_KEY);
  return value === "NEEDS_REAUTH" ? "NEEDS_REAUTH" : "NONE";
}

export function getGoogleCalendarAlertStatus() {
  return readFromStorage();
}

export function setGoogleCalendarAlertStatus(status: GoogleCalendarAlertStatus) {
  if (typeof window === "undefined") {
    return;
  }

  if (status === "NONE") {
    window.sessionStorage.removeItem(GOOGLE_CALENDAR_ALERT_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(GOOGLE_CALENDAR_ALERT_STORAGE_KEY, status);
  }

  window.dispatchEvent(
    new CustomEvent<GoogleCalendarAlertStatus>(GOOGLE_CALENDAR_ALERT_EVENT, {
      detail: status,
    }),
  );
}

export function subscribeGoogleCalendarAlertStatus(
  listener: (status: GoogleCalendarAlertStatus) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<GoogleCalendarAlertStatus>;
    listener(customEvent.detail ?? readFromStorage());
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === GOOGLE_CALENDAR_ALERT_STORAGE_KEY) {
      listener(readFromStorage());
    }
  };

  window.addEventListener(GOOGLE_CALENDAR_ALERT_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(GOOGLE_CALENDAR_ALERT_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
