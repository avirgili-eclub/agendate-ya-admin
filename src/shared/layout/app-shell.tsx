import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, MessageSquare, Search, X } from "lucide-react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { APP_NAV_ITEMS, getPageMeta } from "@/app/navigation";
import { logout } from "@/core/auth/auth-service";
import { getSessionState } from "@/core/auth/session-store";
import {
  getGoogleCalendarAlertStatus,
  subscribeGoogleCalendarAlertStatus,
  type GoogleCalendarAlertStatus,
} from "@/features/calendar/google-calendar-alert";
import { canViewGoogleCalendarStatus } from "@/features/calendar/google-calendar-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { useNotifications } from "@/shared/notifications/notification-store";
import { NotificationPanel } from "@/shared/notifications/notification-panel";

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pageMeta = getPageMeta(pathname);
  const session = getSessionState();
  const { unreadCount } = useNotifications();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [googleCalendarAlertStatus, setGoogleCalendarAlertStatus] =
    useState<GoogleCalendarAlertStatus>(() => getGoogleCalendarAlertStatus());

  const canViewGoogleCalendarAlert = canViewGoogleCalendarStatus(session.user?.role);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return subscribeGoogleCalendarAlertStatus((status) => {
      setGoogleCalendarAlertStatus(status);
    });
  }, []);

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-neutral font-sans text-primary-dark">
      <header className="sticky top-0 z-20 border-b border-neutral-dark bg-neutral-light/95 backdrop-blur" role="banner">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          <div className="text-lg font-bold text-primary">AgendateYA</div>
          <button
            className="rounded-md p-2 text-primary-light hover:bg-neutral focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            type="button"
            aria-label={isMobileMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="main-navigation"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="relative ml-2 hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-neutral-dark bg-white pl-10 pr-3 text-sm outline-none ring-primary-light focus:ring-2 focus-visible:ring-2"
              placeholder="Buscar equipos, clientes o turnos..."
              aria-label="Busqueda global"
            />
          </div>
          <button
            className="relative rounded-md p-2 text-primary-light hover:bg-neutral focus-visible:ring-2 focus-visible:ring-primary"
            type="button"
            aria-label="Notificaciones"
            onClick={() => setIsNotificationPanelOpen(true)}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button className="rounded-md p-2 text-primary-light hover:bg-neutral focus-visible:ring-2 focus-visible:ring-primary" type="button" aria-label="Mensajes">
            <MessageSquare className="size-5" />
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="size-4" /> Cerrar sesion
          </Button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-primary-dark/30 lg:hidden"
          aria-label="Cerrar menú principal"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={`grid grid-cols-1 gap-4 p-4 lg:gap-6 lg:p-6 ${
          isDesktopSidebarCollapsed
            ? "lg:grid-cols-[72px_minmax(0,1fr)]"
            : "lg:grid-cols-[260px_minmax(0,1fr)]"
        }`}
      >
        <aside
          id="main-navigation"
          className={`fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-72 max-w-[85vw] overflow-y-auto border-r border-neutral-dark bg-primary-dark px-3 py-4 text-white shadow-sm transition-transform duration-200 lg:sticky lg:top-20 lg:z-auto lg:h-fit lg:w-full lg:max-w-none lg:translate-x-0 lg:overflow-visible lg:rounded-xl lg:border ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          role="navigation"
          aria-label="Menú principal"
        >
          <div
            className={`mb-4 border-b border-white/20 pb-3 ${
              isDesktopSidebarCollapsed ? "px-1 lg:px-0" : "px-3"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`${isDesktopSidebarCollapsed ? "lg:hidden" : ""}`}>
                <p className="text-sm font-semibold">Admin Console</p>
                <p className="mt-1 truncate text-xs text-white/70">{session.user?.email ?? "Sin sesion"}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsDesktopSidebarCollapsed((current) => !current)}
                className="hidden rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:inline-flex"
                aria-label={isDesktopSidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
                title={isDesktopSidebarCollapsed ? "Expandir" : "Colapsar"}
              >
                {isDesktopSidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
            </div>
          </div>

          <nav className="space-y-1">
            {APP_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-md py-2 text-sm text-white/85 transition-colors hover:bg-primary-light hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isDesktopSidebarCollapsed ? "px-3 lg:justify-center lg:px-2" : "px-3"
                }`}
                activeProps={{ className: "bg-white/15 text-white" }}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isDesktopSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="size-4" aria-hidden="true" />
                <span className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          {canViewGoogleCalendarAlert && googleCalendarAlertStatus === "NEEDS_REAUTH" && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900"
              role="alert"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  Tu conexión con Google Calendar expiró. Ve a Configuración para reconectar.
                </p>
                <a
                  href="/configuracion?tab=integraciones"
                  className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                >
                  Ir a Configuración
                </a>
              </div>
            </div>
          )}

          <PageCard className="bg-neutral-light">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-light">Admin / {pageMeta.title}</p>
            <h1 className="mt-1 text-3xl font-bold text-primary-dark">{pageMeta.title}</h1>
            <p className="mt-1 text-sm text-primary-light">{pageMeta.subtitle}</p>
          </PageCard>

          <Outlet />
        </main>
      </div>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />
    </div>
  );
}
