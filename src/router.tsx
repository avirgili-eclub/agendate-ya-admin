import {
  redirect,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { getSessionState, isAuthenticated } from "@/core/auth/session-store";
import { AppShell } from "@/shared/layout/app-shell";
import { useGoogleOAuthCallback } from "@/features/auth/use-google-oauth-callback";
import { ForbiddenPage } from "@/features/auth/forbidden-page";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { AuthCallbackPage } from "@/features/auth/auth-callback-page";
import { OnboardingPage } from "@/features/auth/onboarding-page";
import { ConfirmEmailPage } from "@/features/auth/confirm-email-page";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { HealthPage } from "@/features/health/health-page";
import { ResourcesPage } from "@/features/resources/resources-page";
import { AgendaPage } from "@/features/agenda/agenda-page";
import { BookingsPage } from "@/features/bookings/bookings-page";
import { ServicesPage } from "@/features/services/services-page";
import { AvailabilityPage } from "@/features/availability/availability-page";
import { ClientsPage } from "@/features/clients/clients-page";
import { LocationsPage } from "@/features/locations/locations-page";
import { UsersPage } from "@/features/users/users-page";
import { TenantSettingsPage } from "@/features/tenant/tenant-settings-page";
import { ProfilePage } from "@/features/profile/profile-page";

function RootLayout() {
  useGoogleOAuthCallback();

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
    const hash = typeof location.hash === "string" ? location.hash : "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const hasOAuthTokens = Boolean(hashParams.get("token") && hashParams.get("refresh"));

    if (!isAuthenticated()) {
      if (hasOAuthTokens) {
        return;
      }

      const returnUrl = `${location.pathname}${location.searchStr ?? ""}`;
      throw redirect({
        to: "/login",
        search: {
          returnUrl,
        },
      });
    }
  },
  component: AppShell,
});

function blockProfessionalRestrictedRoutes() {
  const currentRole = getSessionState().user?.role?.toUpperCase() ?? "";
  if (currentRole === "PROFESSIONAL") {
    throw redirect({ to: "/forbidden" });
  }
}

function allowOnlyProfessional() {
  const currentRole = getSessionState().user?.role?.toUpperCase() ?? "";
  if (currentRole !== "PROFESSIONAL") {
    throw redirect({ to: "/forbidden" });
  }
}

const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/registro",
  component: RegisterPage,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/auth/callback",
  component: AuthCallbackPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const confirmEmailRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/confirm-email",
  component: ConfirmEmailPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
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
  component: AgendaPage,
});

const bookingsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/turnos",
  component: BookingsPage,
});

const clientsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/clientes",
  beforeLoad: blockProfessionalRestrictedRoutes,
  component: ClientsPage,
});

const locationsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/locales",
  component: LocationsPage,
});

const resourcesRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/equipos",
  beforeLoad: blockProfessionalRestrictedRoutes,
  component: ResourcesPage,
});

const legacyResourcesRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/recursos",
  beforeLoad: () => {
    blockProfessionalRestrictedRoutes();
    throw redirect({ to: "/equipos" });
  },
});

const servicesRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/servicios",
  component: ServicesPage,
});

const availabilityRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/disponibilidad",
  component: AvailabilityPage,
});

const teamRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/equipo",
  beforeLoad: blockProfessionalRestrictedRoutes,
  component: UsersPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/configuracion",
  beforeLoad: blockProfessionalRestrictedRoutes,
  component: TenantSettingsPage,
});

const legacySettingsRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/settings",
  beforeLoad: blockProfessionalRestrictedRoutes,
  component: TenantSettingsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: "/perfil",
  beforeLoad: allowOnlyProfessional,
  component: ProfilePage,
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
  publicRoute.addChildren([
    loginRoute,
    registerRoute,
    authCallbackRoute,
    onboardingRoute,
    confirmEmailRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
  ]),
  privateRoute.addChildren([
    indexRoute,
    dashboardRoute,
    agendaRoute,
    bookingsRoute,
    clientsRoute,
    locationsRoute,
    resourcesRoute,
    legacyResourcesRoute,
    servicesRoute,
    availabilityRoute,
    teamRoute,
    settingsRoute,
    legacySettingsRoute,
    profileRoute,
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
