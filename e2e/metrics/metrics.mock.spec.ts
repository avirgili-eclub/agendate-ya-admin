import { expect, test, type Page } from "@playwright/test";

import {
  professionalMetricsFixture,
  professionalRevenueComparisonFixture,
  tenantMetricsFixture,
  tenantMetricsWithUnknownOccupancyFixture,
  tenantRevenueComparisonFixture,
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
    await expect(page.getByRole("heading", { name: "Ingresos: Actual vs Anterior" })).toBeVisible();
    await expect(page.getByText("Semana actual")).toBeVisible();
    await expect(page.getByText("Semana anterior")).toBeVisible();
    await page.getByLabel("Filtros de metricas").getByRole("button", { name: "Filtros" }).click();
    await expect(page.getByLabel("Filtros de metricas").getByText("Sedes", { exact: true })).toBeVisible();
    await expect(page.getByText("Invictus Centro")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recursos por ingresos realizados" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servicios principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clientes principales" })).toBeVisible();

    expect(api.tenantMetricUrls.length).toBeGreaterThan(0);
    expect(api.tenantRevenueComparisonUrls.length).toBeGreaterThan(0);
    expect(api.professionalMetricUrls).toHaveLength(0);
    expect(api.professionalRevenueComparisonUrls).toHaveLength(0);
    expect(api.paths.some((path) => path.includes("/dashboard"))).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });

  test("professional sees own metrics without tenant top resources or location filters", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, {
      professionalMetrics: professionalMetricsFixture,
      professionalRevenueComparison: professionalRevenueComparisonFixture,
    });
    await seedAuthenticatedSession(page, "PROFESSIONAL");

    await page.goto("/metricas");

    await expect(page.getByRole("heading", { name: "Metricas" })).toBeVisible();
    await expect(page.getByLabel("Indicadores principales").getByText("Ingresos realizados")).toBeVisible();
    await expect(page.getByText("Hoy en vivo")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingresos: Actual vs Anterior" })).toBeVisible();
    await expect(page.getByText("Semana actual")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servicios principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clientes principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recursos por ingresos realizados" })).toHaveCount(0);

    expect(api.professionalMetricUrls.length).toBeGreaterThan(0);
    expect(api.professionalRevenueComparisonUrls.length).toBeGreaterThan(0);
    expect(api.tenantMetricUrls).toHaveLength(0);
    expect(api.tenantRevenueComparisonUrls).toHaveLength(0);
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
    expect(api.tenantRevenueComparisonUrls).toHaveLength(0);
    expect(api.professionalRevenueComparisonUrls).toHaveLength(0);
    expect(runtimeErrors).toEqual([]);
  });

  test("unknown occupancy is rendered as unavailable, not as zero", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await mockMetricsApi(page, { tenantMetrics: tenantMetricsWithUnknownOccupancyFixture });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");

    await expect(page.getByText("Ocupación parcialmente no disponible")).toBeVisible();
    await expect(page.getByText(/no se toman como 0%/)).toBeVisible();
    await expect(page.getByText(/Sin configurar/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ocupaci.n/ })).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test("tenant filters send granularity and repeated location ids to metrics API", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const api = await mockMetricsApi(page, { tenantMetrics: tenantMetricsFixture });
    await seedAuthenticatedSession(page, "TENANT_ADMIN");

    await page.goto("/metricas");
    await page.getByLabel("Filtros de metricas").getByRole("button", { name: "Filtros" }).click();
    await page.getByLabel("Filtros de metricas").getByText("Invictus Centro").click();
    await page.getByLabel("Filtros de metricas").getByRole("button", { name: "Buscar" }).click();

    await expect
      .poll(() => api.tenantMetricUrls.some((rawUrl) => new URL(rawUrl).searchParams.getAll("locationIds").includes("loc-invictus-main")))
      .toBe(true);
    await expect
      .poll(() =>
        api.tenantRevenueComparisonUrls.some((rawUrl) =>
          new URL(rawUrl).searchParams.getAll("locationIds").includes("loc-invictus-main"),
        ),
      )
      .toBe(true);

    await page.getByLabel("Filtros de metricas").getByRole("button", { name: "Filtros" }).click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Mes" }).click();
    await page.getByLabel("Filtros de metricas").getByRole("button", { name: "Buscar" }).click();

    await expect
      .poll(() => api.tenantMetricUrls.some((rawUrl) => new URL(rawUrl).searchParams.get("granularity") === "month"))
      .toBe(true);
    await expect
      .poll(() =>
        api.tenantRevenueComparisonUrls.some((rawUrl) => {
          const searchParams = new URL(rawUrl).searchParams;
          return searchParams.get("period") === "month" && searchParams.get("period") !== "day";
        }),
      )
      .toBe(true);
    await expect(page.getByText("Mes actual")).toBeVisible();
    await expect(page.getByText("Semana 1")).toBeVisible();

    expect(api.professionalMetricUrls).toHaveLength(0);
    expect(api.professionalRevenueComparisonUrls).toHaveLength(0);
    expect(runtimeErrors).toEqual([]);
  });
});
