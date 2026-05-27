import { expect, test, type Page, type Route } from "@playwright/test";

import { seedAuthenticatedSession } from "../helpers/auth-session";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "content-type": "application/json; charset=utf-8",
};

type WhatsappStatus = {
  connected: boolean;
  status: "ACTIVE" | "PENDING" | "DISCONNECTED" | "ERROR";
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  displayName: string | null;
};

type StartError = {
  status: 402 | 409 | 502;
  code: "PAYMENT_REQUIRED" | "WHATSAPP_ALREADY_CONNECTED" | "SERVICE_UNAVAILABLE";
};

type WhatsappMockOptions = {
  initialStatus?: WhatsappStatus;
  capabilitiesAvailable?: boolean;
  startError?: StartError;
  activeAfterStartPolls?: number;
};

const disconnectedStatus: WhatsappStatus = {
  connected: false,
  status: "DISCONNECTED",
  inboundEnabled: false,
  outboundEnabled: false,
  phoneNumberId: null,
  displayPhoneNumber: null,
  displayName: null,
};

const pendingStatus: WhatsappStatus = {
  ...disconnectedStatus,
  status: "PENDING",
};

const activeStatus: WhatsappStatus = {
  connected: true,
  status: "ACTIVE",
  inboundEnabled: true,
  outboundEnabled: true,
  phoneNumberId: "internal-phone-id-hidden",
  displayPhoneNumber: "+595 981 123456",
  displayName: "Agenda Test",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: corsHeaders,
    body: JSON.stringify(body),
  });
}

async function mockIntegrationsApi(page: Page, options: WhatsappMockOptions = {}) {
  let whatsappStatus = options.initialStatus ?? disconnectedStatus;
  let onboardingStarted = false;
  let statusPollsAfterStart = 0;
  let startCalls = 0;
  let numberCalls = 0;
  let disconnectCalls = 0;

  await page.context().route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith("/tenant/capabilities")) {
      const enabled = options.capabilitiesAvailable ?? true;
      await fulfillJson(route, {
        data: {
          tenantId: "tenant-test",
          tier: enabled ? "PRO" : "FREE",
          businessType: "BEAUTY",
          businessSubType: "BARBERSHOP",
          modes: {
            payPerVisit: { enabled: true },
            subscriptions: {
              tierAllows: true,
              enabledByTenant: false,
              enabled: false,
              anyPlanConfigured: false,
              activeSubscriptionPlans: 0,
              scheduleModesAvailable: ["FIXED"],
            },
          },
          features: { WHATSAPP: { enabled, available: enabled, tierAllows: enabled } },
          recommended: { subscriptionsMode: null, showSubscriptionsUI: false },
        },
      });
      return;
    }

    if (pathname.endsWith("/admin/notifications")) {
      await fulfillJson(route, { data: { items: [], total: 0 } });
      return;
    }

    if (pathname.endsWith("/admin/notifications/unread-count")) {
      await fulfillJson(route, { data: { unreadCount: 0 } });
      return;
    }

    if (pathname.endsWith("/calendar/auth-status")) {
      await fulfillJson(route, { data: { connected: false, status: "NOT_CONNECTED" } });
      return;
    }

    if (pathname.endsWith("/calendar/auth-url")) {
      await fulfillJson(route, { data: { authUrl: "https://calendar.example.test/connect" } });
      return;
    }

    if (pathname.endsWith("/calendar/disconnect")) {
      await fulfillJson(route, { data: null }, 204);
      return;
    }

    if (pathname.endsWith("/calendar/connections")) {
      await fulfillJson(route, { data: [] });
      return;
    }

    if (pathname.endsWith("/integrations/whatsapp-business/onboarding/start")) {
      startCalls += 1;

      if (options.startError) {
        if (options.startError.code === "WHATSAPP_ALREADY_CONNECTED") {
          whatsappStatus = activeStatus;
        }
        await fulfillJson(
          route,
          { error: { code: options.startError.code, message: "WhatsApp onboarding failed", details: null } },
          options.startError.status,
        );
        return;
      }

      onboardingStarted = true;
      statusPollsAfterStart = 0;
      await fulfillJson(route, {
        data: {
          setupLinkUrl: new URL("/settings?whatsapp=connected", page.url()).toString(),
          expiresAt: "2026-05-28T10:00:00Z",
        },
      });
      return;
    }

    if (pathname.endsWith("/integrations/whatsapp-business/status")) {
      if (onboardingStarted) {
        statusPollsAfterStart += 1;
        whatsappStatus = statusPollsAfterStart >= (options.activeAfterStartPolls ?? 2) ? activeStatus : pendingStatus;
      }
      await fulfillJson(route, { data: whatsappStatus });
      return;
    }

    if (pathname.endsWith("/integrations/whatsapp-business/number")) {
      numberCalls += 1;
      await fulfillJson(route, { error: { code: "UNEXPECTED_NUMBER_CALL", message: "Unexpected", details: null } }, 500);
      return;
    }

    if (pathname.endsWith("/integrations/whatsapp-business")) {
      disconnectCalls += 1;
      whatsappStatus = disconnectedStatus;
      await fulfillJson(route, null, 204);
      return;
    }

    await fulfillJson(route, { data: null });
  });

  return {
    get startCalls() {
      return startCalls;
    },
    get numberCalls() {
      return numberCalls;
    },
    get disconnectCalls() {
      return disconnectCalls;
    },
  };
}

async function openIntegrations(page: Page, options: { blockPopups?: boolean } = {}) {
  await seedAuthenticatedSession(page, "TENANT_ADMIN");
  if (options.blockPopups) {
    await page.addInitScript(() => {
      window.open = () => null;
    });
  }
  await page.goto("/configuracion?tab=integrations");
  await expect(page.getByRole("heading", { name: "Google Calendar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "WhatsApp Business" })).toBeVisible();
}

test.describe("WhatsApp Business integration card", () => {
  test("starts hosted onboarding, returns to settings, and polls until active", async ({ page }) => {
    const api = await mockIntegrationsApi(page);
    await openIntegrations(page);

    await expect(page.getByLabel(/Número de WhatsApp Business/i)).toHaveCount(0);
    await expect(page.locator("span").filter({ hasText: /^Sin conectar$/ })).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Conectar WhatsApp Business" }).click();
    const popup = await popupPromise;

    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(page.locator("span").filter({ hasText: /^Activo$/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Agenda Test")).toBeVisible();
    await expect(page).not.toHaveURL(/whatsapp=/);

    expect(api.startCalls).toBe(1);
    expect(api.numberCalls).toBe(0);
  });

  test("shows FREE upsell copy when onboarding is not included", async ({ page }) => {
    const api = await mockIntegrationsApi(page, { capabilitiesAvailable: false });
    await openIntegrations(page);

    await expect(page.getByText("Tu plan actual no incluye WhatsApp Business")).toBeVisible();
    await expect(page.getByRole("button", { name: "Conectar WhatsApp Business" })).toHaveCount(0);
    expect(api.startCalls).toBe(0);
  });

  test("refreshes status when onboarding reports an already connected account", async ({ page }) => {
    const api = await mockIntegrationsApi(page, {
      startError: { status: 409, code: "WHATSAPP_ALREADY_CONNECTED" },
    });
    await openIntegrations(page);

    await page.getByRole("button", { name: "Conectar WhatsApp Business" }).click();

    await expect(page.getByText("La cuenta de WhatsApp Business ya está conectada")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Activo$/ })).toBeVisible();
    expect(api.startCalls).toBe(1);
    expect(api.numberCalls).toBe(0);
  });

  test("shows retry-later copy when onboarding is temporarily unavailable", async ({ page }) => {
    const api = await mockIntegrationsApi(page, {
      startError: { status: 502, code: "SERVICE_UNAVAILABLE" },
    });
    await openIntegrations(page);

    await page.getByRole("button", { name: "Conectar WhatsApp Business" }).click();

    await expect(page.getByText("WhatsApp Business no está disponible en este momento")).toBeVisible();
    expect(api.startCalls).toBe(1);
    expect(api.numberCalls).toBe(0);
  });

  test("offers a full-page fallback when the onboarding popup is blocked", async ({ page }) => {
    const api = await mockIntegrationsApi(page);
    await openIntegrations(page, { blockPopups: true });

    await page.getByRole("button", { name: "Conectar WhatsApp Business" }).click();

    await expect(page.getByText("Tu navegador bloqueó la ventana emergente").first()).toBeVisible();
    await page.getByRole("button", { name: "Continuar en esta pestaña" }).click();
    await expect(page.locator("span").filter({ hasText: /^Activo$/ })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL(/whatsapp=/);

    expect(api.startCalls).toBe(1);
    expect(api.numberCalls).toBe(0);
  });

  test("disconnects an active WhatsApp Business account after confirmation", async ({ page }) => {
    const api = await mockIntegrationsApi(page, { initialStatus: activeStatus });
    await openIntegrations(page);

    await expect(page.getByText("Recepción de mensajes activa")).toBeVisible();
    await expect(page.getByText("Envío de mensajes activo")).toBeVisible();
    await page.getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByText("¿Seguro? Dejarás de enviar y recibir mensajes por WhatsApp Business")).toBeVisible();
    await page.locator('[role="dialog"] button').filter({ hasText: "Desconectar" }).click();

    await expect(page.getByText("WhatsApp Business desconectado correctamente.")).toBeVisible();
    await expect(page.getByText("Conectá WhatsApp Business sin cargar números manualmente.")).toBeVisible();
    expect(api.disconnectCalls).toBe(1);
  });

  test("stacks Google Calendar and WhatsApp cards on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockIntegrationsApi(page);
    await openIntegrations(page);

    await expect(page.getByRole("button", { name: "Conectar WhatsApp Business" })).toHaveClass(/w-full/);
    const googleBox = await page.getByRole("heading", { name: "Google Calendar" }).boundingBox();
    const whatsappBox = await page.getByRole("heading", { name: "WhatsApp Business" }).boundingBox();

    expect(googleBox).not.toBeNull();
    expect(whatsappBox).not.toBeNull();
    expect(whatsappBox!.y).toBeGreaterThan(googleBox!.y + 40);
  });
});
