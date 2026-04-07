import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { confirmEmail, resendConfirmation } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { AuthLayout } from "./components/auth-layout";
import { getRateLimitMessage, isRateLimitError, useRateLimitCooldown } from "./rate-limit";

type ConfirmState = "loading" | "success" | "error";

export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const [state, setState] = useState<ConfirmState>("loading");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const { isCoolingDown, remainingSeconds, startCooldown } = useRateLimitCooldown();

  useEffect(() => {
    const search = location.search as Record<string, string | undefined>;
    const token = search.token;

    if (!token) {
      setState("error");
      return;
    }

    confirmEmail(token)
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [location.search]);

  useEffect(() => {
    if (state !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      void navigate({ to: "/dashboard" });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [navigate, state]);

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setResendFeedback("Ingresa un email valido para reenviar la confirmacion.");
      return;
    }

    setIsResending(true);
    setResendFeedback(null);

    try {
      await resendConfirmation(email.trim());
      setResendFeedback("Si el email existe y no esta verificado, recibiras un nuevo enlace.");
    } catch (error) {
      const appError = error as AppError;
      if (isRateLimitError(appError)) {
        setResendFeedback(getRateLimitMessage(appError));
        startCooldown();
      } else {
        setResendFeedback("Si el email existe y no esta verificado, recibiras un nuevo enlace.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {state === "loading" ? (
          <section className="rounded-xl border border-neutral-dark bg-white p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-dark border-t-primary" />
            </div>
            <p className="text-sm text-primary-light">Verificando tu email...</p>
          </section>
        ) : null}

        {state === "success" ? (
          <section className="rounded-xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-900">¡Email verificado con éxito!</h1>
            <p className="mt-2 text-sm text-green-700">
              Ya podés usar todas las funciones de AgendateYA.
            </p>
            <p className="mt-1 text-xs text-green-700">Te redirigimos automáticamente al dashboard.</p>
            <Link to="/dashboard" className="mt-6 inline-block">
              <Button size="lg">Ir al dashboard</Button>
            </Link>
          </section>
        ) : null}

        {state === "error" ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-900">Link inválido o expirado</h1>
            <p className="mt-2 text-sm text-red-700">
              El link de confirmación expiró o ya fue usado.
            </p>

            <div className="mx-auto mt-5 max-w-sm text-left">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-red-900">Reenviar a este email</span>
                <input
                  className="h-11 w-full rounded-md border border-red-200 bg-white px-3 text-sm outline-none ring-red-200 transition focus:border-red-400 focus:ring-2"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </label>

              <Button
                type="button"
                className="mt-3 w-full"
                size="lg"
                onClick={handleResendConfirmation}
                disabled={isResending || isCoolingDown}
              >
                {isResending
                  ? "Reenviando..."
                  : isCoolingDown
                    ? `Espera ${remainingSeconds}s`
                    : "Reenviar email de confirmacion"}
              </Button>

              {resendFeedback ? <p className="mt-2 text-xs text-red-800">{resendFeedback}</p> : null}
            </div>

            <div className="mt-6 space-x-3">
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Ir al login
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </AuthLayout>
  );
}
