import {
  redirect,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { isAuthenticated } from "@/core/auth/session-store";
import { AppShell } from "@/shared/layout/app-shell";
import { ForbiddenPage } from "@/features/auth/forbidden-page";
import { LoginPage } from "@/features/auth/login-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { HealthPage } from "@/features/health/health-page";
import { ModulePlaceholderPage } from "@/features/placeholders/module-placeholder-page";
import { ResourcesPage } from "@/features/resources/resources-page";

function RootLayout() {
  return (
    <main className="min-h-screen bg-neutral font-sans text-primary-dark">
      <Outlet />
    </main>
  );
}

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-neutral-dark bg-neutral-light p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-primary">404</h1>
      <p className="mt-2 text-sm text-primary-light">Route not found.</p>
    </section>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  component: Outlet,
});

const privateRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "private",
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
      });
    }
  },
  component: AppShell,
});

const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/",
  component: DashboardPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const agendaRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/agenda",
  component: () => <ModulePlaceholderPage moduleName="Agenda" routePath="/agenda" />,
});

const clientsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/clientes",
  component: () => <ModulePlaceholderPage moduleName="Clientes" routePath="/clientes" />,
});

const locationsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/locales",
  component: () => <ModulePlaceholderPage moduleName="Locales" routePath="/locales" />,
});

const resourcesRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/recursos",
  component: ResourcesPage,
});

const servicesRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/servicios",
  component: () => <ModulePlaceholderPage moduleName="Servicios" routePath="/servicios" />,
});

const availabilityRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/disponibilidad",
  component: () => <ModulePlaceholderPage moduleName="Disponibilidad" routePath="/disponibilidad" />,
});

const teamRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/equipo",
  component: () => <ModulePlaceholderPage moduleName="Equipo" routePath="/equipo" />,
});

const settingsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/configuracion",
  component: () => <ModulePlaceholderPage moduleName="Configuracion" routePath="/configuracion" />,
});

const healthRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/health",
  component: HealthPage,
});

const forbiddenRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/forbidden",
  component: ForbiddenPage,
});

const routeTree = rootRoute.addChildren([
  publicRoute.addChildren([loginRoute]),
  privateRoute.addChildren([
    indexRoute,
    dashboardRoute,
    agendaRoute,
    clientsRoute,
    locationsRoute,
    resourcesRoute,
    servicesRoute,
    availabilityRoute,
    teamRoute,
    settingsRoute,
    healthRoute,
    forbiddenRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
