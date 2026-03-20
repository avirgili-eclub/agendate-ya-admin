import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import type { AppError } from "@/core/errors/app-error";
import { login } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";

function toFriendlyLoginMessage(appError: AppError) {
  if (
    appError.code === "REQUEST_TIMEOUT" ||
    appError.code === "SERVICE_UNAVAILABLE" ||
    appError.status === 408 ||
    appError.status === 503 ||
    appError.status === 0
  ) {
    return "El servicio no se encuentra disponible. Vuelve a intentarlo mas tarde.";
  }
  if (appError.code === "UNAUTHORIZED" || appError.code === "VALIDATION_ERROR" || appError.status === 400) {
    return "No pudimos iniciar sesion. Verifica usuario o contrasena e intenta nuevamente.";
  }
  return "No pudimos iniciar sesion en este momento. Vuelve a intentarlo.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionExpired = useMemo(() => {
    const search = location.search as Record<string, string | undefined>;
    return search.reason === "session-expired";
  }, [location.search]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      await navigate({ to: "/" });
    } catch (e) {
      const appError = e as AppError;
      setError(toFriendlyLoginMessage(appError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-xl border border-neutral-dark bg-neutral-light p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-primary">Iniciar sesion</h1>
      <p className="mt-1 text-sm text-primary-light">Accede al panel administrador.</p>
      {import.meta.env.DEV ? (
        <p className="mt-1 text-xs text-primary-light">Bypass local habilitado: email admin@admin.com, contrasena admin123.</p>
      ) : null}

      {sessionExpired ? (
        <div className="mt-4 rounded-md border border-secondary-light bg-secondary/10 px-3 py-2 text-sm text-secondary-dark">
          Tu sesion expiro. Inicia sesion nuevamente.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Email</span>
          <input
            className="h-10 w-full rounded-md border border-neutral-dark px-3 outline-none ring-primary-light focus:ring-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Contrasena</span>
          <input
            className="h-10 w-full rounded-md border border-neutral-dark px-3 outline-none ring-primary-light focus:ring-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </section>
  );
}
