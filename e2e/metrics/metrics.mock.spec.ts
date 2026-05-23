import { expect, test, type Page } from "@playwright/test";

import {
  professionalMetricsFixture,
  tenantMetricsFixture,
  tenantMetricsWithUnknownOccupancyFixture,
} from "../fixtures/metrics-fixtures";
import { seedAuthenticatedSession } from "../helpers/auth-session";
import { mockMetricsApi } from "../helpers/metrics-api-mocks";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

test.describe("metrics page with mocked API", () => {
  test("tenant admin sees paid metrics widgets and tenant-only filters", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, { tenantMetrics: tenantMetricsFixture });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");

    await expect(page.getByRole("heading", { name: "Metricas" })).toBeVisible();
    await expect(page.getByLabel("Indicadores principales").getByText("Ingresos realizados")).toBeVisible();
    await expect(page.getByText("Reservas completadas solamente")).toBeVisible();
    await expect(page.getByText("Hoy en vivo")).toBeVisible();
    await expect(page.getByLabel("Filtros de metricas").getByText("Locales", { exact: true })).toBeVisible();
    await expect(page.getByText("Invictus Centro")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recursos por ingresos realizados" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servicios principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clientes principales" })).toBeVisible();

    expect(api.tenantMetricUrls.length).toBeGreaterThan(0);
    expect(api.professionalMetricUrls).toHaveLength(0);
    expect(api.paths.some((path) => path.includes("/dashboard"))).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test("professional sees own metrics without tenant top resources or location filters", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, { professionalMetrics: professionalMetricsFixture });
    await seedAuthenticatedSession(page, "PROFESSIONAL");

    await page.goto("/metricas");

    await expect(page.getByRole("heading", { name: "Metricas" })).toBeVisible();
    await expect(page.getByLabel("Indicadores principales").getByText("Ingresos realizados")).toBeVisible();
    await expect(page.getByText("Hoy en vivo")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servicios principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clientes principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recursos por ingresos realizados" })).toHaveCount(0);

    expect(api.professionalMetricUrls.length).toBeGreaterThan(0);
    expect(api.tenantMetricUrls).toHaveLength(0);
    expect(api.paths.some((path) => path.includes("/locations"))).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test("tier-locked tenants see upgrade state without fetching metrics", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, { capabilitiesEnabled: false });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");

    await expect(page.getByRole("heading", { name: "Métricas avanzadas no disponibles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver suscripción" })).toHaveAttribute(
      "href",
      "/configuracion?tab=subscription",
    );

    expect(api.tenantMetricUrls).toHaveLength(0);
    expect(api.professionalMetricUrls).toHaveLength(0);
    expect(runtimeErrors).toEqual([]);
  });

  test("unknown occupancy is rendered as unavailable, not as zero", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await mockMetricsApi(page, { tenantMetrics: tenantMetricsWithUnknownOccupancyFixture });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");

    await expect(page.getByText("Ocupación parcialmente no disponible")).toBeVisible();
    await expect(page.getByText(/no se convierten a 0%/)).toBeVisible();
    await expect(page.getByText("Sin configurar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ocupacion" })).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test("tenant filters send granularity and repeated location ids to metrics API", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, { tenantMetrics: tenantMetricsFixture });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");
    await page.getByLabel("Filtros de metricas").getByText("Invictus Centro").click();

    await expect
      .poll(() => api.tenantMetricUrls.some((rawUrl) => new URL(rawUrl).searchParams.getAll("locationIds").includes("loc-invictus-main")))
      .toBe(true);

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Semana" }).click();

    await expect
      .poll(() => api.tenantMetricUrls.some((rawUrl) => new URL(rawUrl).searchParams.get("granularity") === "week"))
      .toBe(true);

    expect(api.professionalMetricUrls).toHaveLength(0);
    expect(runtimeErrors).toEqual([]);
  });
});
