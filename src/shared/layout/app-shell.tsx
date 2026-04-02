import { Bell, LogOut, MessageSquare, Search } from "lucide-react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { APP_NAV_ITEMS, getPageMeta } from "@/app/navigation";
import { logout } from "@/core/auth/auth-service";
import { getSessionState } from "@/core/auth/session-store";
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

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-neutral font-sans text-primary-dark">
      <header className="sticky top-0 z-20 border-b border-neutral-dark bg-neutral-light/95 backdrop-blur" role="banner">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          <div className="text-lg font-bold text-primary">AgendateYA</div>
          <div className="relative ml-2 hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-neutral-dark bg-white pl-10 pr-3 text-sm outline-none ring-primary-light focus:ring-2 focus-visible:ring-2"
              placeholder="Buscar recursos, clientes o turnos..."
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

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <aside className="rounded-xl border border-neutral-dark bg-primary-dark px-3 py-4 text-white shadow-sm lg:sticky lg:top-20 lg:h-fit" role="navigation" aria-label="Menu principal">
          <div className="mb-4 border-b border-white/20 px-3 pb-3">
            <p className="text-sm font-semibold">Admin Console</p>
            <p className="mt-1 truncate text-xs text-white/70">{session.user?.email ?? "Sin sesion"}</p>
          </div>

          <nav className="space-y-1">
            {APP_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/85 transition-colors hover:bg-primary-light hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                activeProps={{ className: "bg-white/15 text-white" }}
              >
                <item.icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
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
