import { Bell, LogOut, MessageSquare, Search } from "lucide-react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { APP_NAV_ITEMS, getPageMeta } from "@/app/navigation";
import { logout } from "@/core/auth/auth-service";
import { getSessionState } from "@/core/auth/session-store";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pageMeta = getPageMeta(pathname);
  const session = getSessionState();

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-neutral font-sans text-primary-dark">
      <header className="sticky top-0 z-20 border-b border-neutral-dark bg-neutral-light/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          <div className="text-lg font-bold text-primary">AgendateYA</div>
          <div className="relative ml-2 hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
            <input
              className="h-10 w-full rounded-lg border border-neutral-dark bg-white pl-10 pr-3 text-sm outline-none ring-primary-light focus:ring-2"
              placeholder="Buscar recursos, clientes o turnos..."
            />
          </div>
          <button className="rounded-md p-2 text-primary-light hover:bg-neutral" type="button" aria-label="Notificaciones">
            <Bell className="size-5" />
          </button>
          <button className="rounded-md p-2 text-primary-light hover:bg-neutral" type="button" aria-label="Mensajes">
            <MessageSquare className="size-5" />
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="size-4" /> Cerrar sesion
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <aside className="rounded-xl border border-neutral-dark bg-primary-dark px-3 py-4 text-white shadow-sm">
          <div className="mb-4 border-b border-white/20 px-3 pb-3">
            <p className="text-sm font-semibold">Admin Console</p>
            <p className="mt-1 text-xs text-white/70">{session.user?.email ?? "Sin sesion"}</p>
          </div>

          <nav className="space-y-1">
            {APP_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/85 transition-colors hover:bg-primary-light hover:text-white"
                activeProps={{ className: "bg-white/15 text-white" }}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-4">
          <PageCard className="bg-neutral-light">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-light">Admin / {pageMeta.title}</p>
            <h1 className="mt-1 text-3xl font-bold text-primary-dark">{pageMeta.title}</h1>
            <p className="mt-1 text-sm text-primary-light">{pageMeta.subtitle}</p>
          </PageCard>

          <Outlet />
        </section>
      </div>
    </div>
  );
}
