import { FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { forgotPassword } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { AuthLayout } from "./components/auth-layout";
import { getRateLimitMessage, isRateLimitError, useRateLimitCooldown } from "./rate-limit";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isCoolingDown, remainingSeconds, startCooldown } = useRateLimitCooldown();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (error) {
      const appError = error as AppError;
      if (isRateLimitError(appError)) {
        setError(getRateLimitMessage(appError));
        startCooldown();
        return;
      }
      // Always show success message (anti-enumeration)
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-dark bg-white p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <Mail className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Revisa tu correo</h1>
            <p className="mt-2 text-sm text-primary-light">
              Si ese email está registrado, recibirás las instrucciones en breve para restablecer tu
              contraseña.
            </p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="outline" size="lg">
                Volver al login
              </Button>
            </Link>
          </section>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-primary">Recupera tu contraseña</h1>
          <p className="mt-2 text-sm text-primary-light">
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-dark bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

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

            <Button className="w-full" type="submit" disabled={isLoading || isCoolingDown} size="lg">
              {isLoading ? "Enviando..." : isCoolingDown ? `Espera ${remainingSeconds}s` : "Enviar link de recupero"}
            </Button>

            {isCoolingDown ? (
              <p className="text-center text-xs text-secondary">
                Limite temporal alcanzado. Espera {remainingSeconds}s antes de reintentar.
              </p>
            ) : null}

            <p className="text-center text-sm text-primary-light">
              ¿Recordaste tu contraseña?{" "}
              <Link
                to="/login"
                className="font-medium text-secondary transition hover:text-secondary-light"
              >
                Inicia sesión
              </Link>
            </p>
          </form>
        </section>
      </div>
    </AuthLayout>
  );
}
