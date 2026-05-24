import type { Page, Route } from "@playwright/test";

import { tenantMetricsFixture } from "../fixtures/metrics-fixtures";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "content-type": "application/json; charset=utf-8",
};

const defaultLocations = [
  {
    id: "loc-invictus-main",
    tenantId: "tenant-test",
    name: "Invictus Centro",
    address: "Local principal",
    phone: null,
    imageUrl: null,
    latitude: null,
    longitude: null,
    metadata: null,
    businessHoursSummary: null,
    businessHours: null,
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "loc-invictus-norte",
    tenantId: "tenant-test",
    name: "Invictus Norte",
    address: "Sucursal norte",
    phone: null,
    imageUrl: null,
    latitude: null,
    longitude: null,
    metadata: null,
    businessHoursSummary: null,
    businessHours: null,
    active: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

function buildCapabilities(enabled: boolean) {
  return {
    data: {
      tenantId: "tenant-test",
      tier: enabled ? "PRO" : "BASIC",
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
      features: {
        METRICS_DASHBOARD: {
          enabled,
          tierAllows: enabled,
          enabledByTenant: enabled,
        },
      },
      recommended: {
        subscriptionsMode: null,
        showSubscriptionsUI: false,
      },
    },
  };
}

function buildProfessionalResource() {
  return {
    data: {
      id: "resource-professional-1",
      locationId: "loc-invictus-main",
      resourceType: "PROFESSIONAL",
      name: "Professional Test Resource",
      imageUrl: null,
      active: true,
      calendarConnected: false,
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: corsHeaders,
    body: JSON.stringify(body),
  });
}

type MetricsApiMockOptions = {
  capabilitiesEnabled?: boolean;
  tenantMetrics?: unknown;
  professionalMetrics?: unknown;
  tenantMetricsStatus?: number;
  tenantMetricsError?: unknown;
  professionalMetricsStatus?: number;
  professionalMetricsError?: unknown;
  locations?: unknown[];
};

export async function mockMetricsApi(page: Page, options: MetricsApiMockOptions = {}) {
  const calls = {
    paths: [] as string[],
    tenantMetricUrls: [] as string[],
    professionalMetricUrls: [] as string[],
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    calls.paths.push(`${request.method()} ${pathname}`);

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith("/tenant/capabilities")) {
      await fulfillJson(route, buildCapabilities(options.capabilitiesEnabled ?? true));
      return;
    }

    if (pathname.endsWith("/metrics/tenant")) {
      calls.tenantMetricUrls.push(url.toString());
      if (options.tenantMetricsStatus && options.tenantMetricsStatus >= 400) {
        await fulfillJson(
          route,
          options.tenantMetricsError ?? {
            error: {
              code: "FEATURE_NOT_AVAILABLE",
              message: "Metrics are not available for this tenant.",
              details: null,
            },
          },
          options.tenantMetricsStatus,
        );
        return;
      }
      await fulfillJson(route, options.tenantMetrics ?? tenantMetricsFixture);
      return;
    }

    if (pathname.endsWith("/metrics/professional/me")) {
      calls.professionalMetricUrls.push(url.toString());
      if (options.professionalMetricsStatus && options.professionalMetricsStatus >= 400) {
        await fulfillJson(
          route,
          options.professionalMetricsError ?? {
            error: {
              code: "RESOURCE_NOT_ASSIGNED",
              message: "Professional user has no assigned resource.",
              details: null,
            },
          },
          options.professionalMetricsStatus,
        );
        return;
      }
      await fulfillJson(route, options.professionalMetrics ?? tenantMetricsFixture);
      return;
    }

    if (pathname.endsWith("/locations")) {
      await fulfillJson(route, { data: options.locations ?? defaultLocations });
      return;
    }

    if (/\/resources\/[^/]+$/.test(pathname)) {
      await fulfillJson(route, buildProfessionalResource());
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

    await fulfillJson(route, { data: null });
  });

  return calls;
}
