import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";

import { resetPassword } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { PasswordInput } from "@/shared/ui/password-input";
import { AuthLayout } from "./components/auth-layout";

const PASSWORD_REQUIREMENTS = [
  {
    key: "minLength",
    label: "Minimo 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    key: "uppercase",
    label: "Al menos una letra mayuscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: "lowercase",
    label: "Al menos una letra minuscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    key: "number",
    label: "Al menos un numero",
    test: (value: string) => /\d/.test(value),
  },
] as const;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const token = useMemo(() => {
    const search = location.search as Record<string, string | undefined>;
    return search.token;
  }, [location.search]);

  const passwordRequirementStatus = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((rule) => ({
        key: rule.key,
        label: rule.label,
        isMet: rule.test(password),
      })),
    [password],
  );

  const allRequirementsMet = passwordRequirementStatus.every((r) => r.isMet);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordTouched(true);

    if (!token) {
      setError("Link invalido. Por favor, solicita un nuevo link de recupero.");
      return;
    }

    if (!allRequirementsMet) {
      setError("La contraseña debe cumplir con todos los requisitos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      setError("El link expiró o ya fue usado. Solicitá uno nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <section className="rounded-xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-900">Contraseña actualizada</h1>
            <p className="mt-2 text-sm text-green-700">Ya podés iniciar sesión con tu nueva contraseña.</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button size="lg">Ir al login</Button>
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
          <h1 className="text-3xl font-bold text-primary">Restablece tu contraseña</h1>
          <p className="mt-2 text-sm text-primary-light">Ingresa tu nueva contraseña.</p>
        </header>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-neutral-dark bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-primary-dark">
                Nueva contraseña
              </span>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="••••••••"
                required
              />
              {passwordTouched ? (
                <ul className="mt-2 space-y-1">
                  {passwordRequirementStatus.map((req) => (
                    <li
                      key={req.key}
                      className={`text-xs ${req.isMet ? "text-green-600" : "text-primary-light"}`}
                    >
                      {req.isMet ? "✓" : "•"} {req.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-primary-dark">
                Confirma tu contraseña
              </span>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <Button className="w-full" type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>

            <p className="text-center text-sm text-primary-light">
              <Link
                to="/forgot-password"
                className="font-medium text-secondary transition hover:text-secondary-light"
              >
                Solicitar nuevo link
              </Link>
            </p>
          </form>
        </section>
      </div>
    </AuthLayout>
  );
}
