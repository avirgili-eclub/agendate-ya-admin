import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import type { AppError } from "@/core/errors/app-error";
import { login } from "@/core/auth/auth-service";
import { setGoogleCalendarAlertStatus } from "@/features/calendar/google-calendar-alert";
import { runSilentGoogleCalendarStatusCheck } from "@/features/calendar/google-calendar-service";
import { Button } from "@/shared/ui/button";
import { PasswordInput } from "@/shared/ui/password-input";
import { AuthLayout } from "./components/auth-layout";
import { GoogleButton } from "./components/google-button";

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

  const loginReturnUrl = useMemo(() => {
    const search = location.search as Record<string, string | undefined>;
    return search.returnUrl ?? search.redirect;
  }, [location.search]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const authData = await login({ email, password });
      setGoogleCalendarAlertStatus("NONE");
      // Silent background check: must never block or break login.
      void runSilentGoogleCalendarStatusCheck(authData.user.role);

      if (loginReturnUrl && loginReturnUrl.startsWith("/")) {
        window.location.assign(loginReturnUrl);
        return;
      }

      await navigate({ to: "/" });
    } catch (e) {
      const appError = e as AppError;
      setError(toFriendlyLoginMessage(appError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="text-3xl font-bold text-primary">Bienvenido de vuelta</h1>
        <p className="mt-2 text-sm text-primary-light">Ingresa tus credenciales para acceder al panel administrador.</p>

        {sessionExpired ? (
          <div role="alert" className="mt-4 rounded-md border border-secondary-light bg-secondary/10 px-3 py-2 text-sm text-secondary-dark">
            Tu sesion expiro. Inicia sesion nuevamente.
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <GoogleButton onClick={() => alert("Funcionalidad de Google OAuth pendiente de implementar")}>
            Continuar con Google
          </GoogleButton>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-dark" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-neutral px-2 text-primary-light">O continua con email</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Email</span>
            <input
              className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
              name="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Contraseña</span>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <Button className="w-full" type="submit" disabled={isLoading} size="lg">
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>

          <p className="text-center text-sm text-primary-light">
            ¿Todavía no tienes una cuenta?{" "}
            <Link to="/registro" className="font-medium text-secondary hover:text-secondary-light transition">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
