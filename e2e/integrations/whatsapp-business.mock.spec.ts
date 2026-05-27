import { expect, test, type Page, type Route } from "@playwright/test";

import { seedAuthenticatedSession } from "../helpers/auth-session";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,DELETE,OPTIONS",
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

type WhatsappMockOptions = {
  initialStatus?: WhatsappStatus;
  failConfigureWithNotProvisioned?: boolean;
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
  const configurePayloads: unknown[] = [];
  let disconnectCalls = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith("/tenant/capabilities")) {
      await fulfillJson(route, {
        data: {
          tenantId: "tenant-test",
          tier: "PRO",
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
          features: {},
          recommended: {
            subscriptionsMode: null,
            showSubscriptionsUI: false,
          },
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

    if (pathname.endsWith("/integrations/whatsapp-business/status")) {
      await fulfillJson(route, { data: whatsappStatus });
      return;
    }

    if (pathname.endsWith("/integrations/whatsapp-business/number")) {
      if (options.failConfigureWithNotProvisioned) {
        await fulfillJson(
          route,
          {
            error: {
              code: "WHATSAPP_PROVIDER_PHONE_NUMBER_NOT_PROVISIONED",
              message: "Phone number is not provisioned.",
              details: null,
            },
          },
          403,
        );
        return;
      }

      const payload = request.postDataJSON();
      configurePayloads.push(payload);
      whatsappStatus = {
        ...activeStatus,
        displayPhoneNumber: payload.displayPhoneNumber ?? payload.phoneNumber,
        displayName: payload.displayName ?? null,
      };
      await fulfillJson(route, { data: whatsappStatus });
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
    get configurePayloads() {
      return configurePayloads;
    },
    get disconnectCalls() {
      return disconnectCalls;
    },
  };
}

async function openIntegrations(page: Page) {
  await seedAuthenticatedSession(page, "TENANT_ADMIN");
  await page.goto("/configuracion?tab=integrations");
  await expect(page.getByRole("heading", { name: "Google Calendar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "WhatsApp Business" })).toBeVisible();
}

test.describe("WhatsApp Business integration card", () => {
  test("shows disconnected state and configures a user-facing number", async ({ page }) => {
    const api = await mockIntegrationsApi(page);
    await openIntegrations(page);

    await expect(page.locator("span", { hasText: "Sin conectar" })).toBeVisible();
    await page.getByLabel("Número de WhatsApp Business").fill("+595981123456");
    await page.getByLabel("Número visible").fill("+595 981 123456");
    await page.getByLabel("Nombre para mostrar").fill("Agenda Test");
    await page.getByRole("button", { name: "Conectar número" }).click();

    await expect(page.getByText("Número de WhatsApp Business guardado correctamente.")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Activo$/ })).toBeVisible();
    await expect(page.getByText("+595 981 123456")).toBeVisible();

    expect(api.configurePayloads).toEqual([
      {
        phoneNumber: "+595981123456",
        displayPhoneNumber: "+595 981 123456",
        displayName: "Agenda Test",
      },
    ]);
    expect(JSON.stringify(api.configurePayloads)).not.toMatch(/providerPhoneNumberId|wabaId|WABA|Kapso|transport/);
  });

  test("shows the friendly activation error when the number is not enabled", async ({ page }) => {
    await mockIntegrationsApi(page, { failConfigureWithNotProvisioned: true });
    await openIntegrations(page);

    await page.getByLabel("Número de WhatsApp Business").fill("+595981000000");
    await page.getByRole("button", { name: "Conectar número" }).click();

    await expect(page.getByText("Este número aún no está habilitado para tu cuenta. Escribinos para activarlo.")).toBeVisible();
  });

  test("disconnects an active WhatsApp Business number after confirmation", async ({ page }) => {
    const api = await mockIntegrationsApi(page, { initialStatus: activeStatus });
    await openIntegrations(page);

    await expect(page.getByText("Recepción de mensajes activa")).toBeVisible();
    await expect(page.getByText("Envío de mensajes activo")).toBeVisible();
    await page.getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByText("Desconectar WhatsApp Business")).toBeVisible();
    await page.locator('[role="dialog"] button').filter({ hasText: "Desconectar" }).click();

    await expect(page.getByText("WhatsApp Business desconectado correctamente.")).toBeVisible();
    await expect(page.getByText("Todavía no conectaste un número.")).toBeVisible();
    expect(api.disconnectCalls).toBe(1);
  });

  test("stacks Google Calendar and WhatsApp cards on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockIntegrationsApi(page);
    await openIntegrations(page);

    const googleBox = await page.getByRole("heading", { name: "Google Calendar" }).boundingBox();
    const whatsappBox = await page.getByRole("heading", { name: "WhatsApp Business" }).boundingBox();

    expect(googleBox).not.toBeNull();
    expect(whatsappBox).not.toBeNull();
    expect(whatsappBox!.y).toBeGreaterThan(googleBox!.y + 40);
  });
});
