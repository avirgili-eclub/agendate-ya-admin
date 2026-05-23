import type { Page } from "@playwright/test";

type TestRole = "TENANT_ADMIN" | "LOCATION_MANAGER" | "PROFESSIONAL" | "SUPER_ADMIN";

const SESSION_STORAGE_KEY = "agendateya_admin_session";

function getUserForRole(role: TestRole) {
  if (role === "PROFESSIONAL") {
    return {
      id: "user-professional-1",
      email: "professional@example.test",
      fullName: "Professional Test User",
      role,
      emailVerified: true,
      resourceId: "resource-professional-1",
    };
  }

  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase().replaceAll("_", "-")}@example.test`,
    fullName: "Admin Test User",
    role,
    emailVerified: true,
  };
}

export async function seedAuthenticatedSession(page: Page, role: TestRole = "TENANT_ADMIN") {
  const session = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    user: getUserForRole(role),
  };

  await page.addInitScript(
    ({ storageKey, authSession }) => {
      class NoopEventSource {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSED = 2;

        readonly CONNECTING = 0;
        readonly OPEN = 1;
        readonly CLOSED = 2;
        readyState = 1;
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        constructor(readonly url: string) {
          window.queueMicrotask(() => {
            this.onopen?.(new Event("open"));
          });
        }

        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() {
          return true;
        }
        close() {
          this.readyState = 2;
        }
      }

      Object.defineProperty(window, "EventSource", {
        configurable: true,
        writable: true,
        value: NoopEventSource,
      });

      window.sessionStorage.setItem(storageKey, JSON.stringify(authSession));
    },
    { storageKey: SESSION_STORAGE_KEY, authSession: session },
  );
}
