import { useNavigate } from "@tanstack/react-router";

import { logout } from "@/core/auth/auth-service";
import { getSessionState } from "@/core/auth/session-store";
import { Button } from "@/shared/ui/button";

export function HomePage() {
  const navigate = useNavigate();
  const session = getSessionState();

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-neutral-dark bg-neutral-light p-8 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">AgendateYA Admin</h1>
          <p className="mt-2 text-sm text-primary-light">
            Slice 1 ready: protected route and auth session flow are active.
          </p>
          <p className="mt-2 text-xs text-primary-light">Usuario: {session.user?.email ?? "N/A"}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Cerrar sesion
        </Button>
      </div>
    </section>
  );
}
