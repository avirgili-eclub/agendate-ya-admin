import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, UserPlus, ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { AuthLayout } from "./components/auth-layout";

type RegistrationPath = "business" | "professional";

export function PathSelectionPage() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as { plan?: string };
  const planParam = search?.plan;

  const [selectedPath, setSelectedPath] = useState<RegistrationPath>("business");
  const [showProfessionalNotice, setShowProfessionalNotice] = useState(false);

  function handleContinue() {
    if (selectedPath === "business") {
      navigate({
        to: "/registro",
        search: { plan: planParam },
      });
    } else {
      setShowProfessionalNotice(true);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-primary">Crea tu cuenta</h1>
          <p className="mt-2 text-sm text-primary-light">
            Elige cómo quieres registrarte para comenzar.
          </p>
        </header>

        {/* Path selection cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card: Register business */}
          <label
            className={cn(
              "relative flex cursor-pointer flex-col rounded-xl border-2 bg-white p-5 transition-all",
              "hover:border-secondary/60 hover:shadow-sm",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2",
              selectedPath === "business"
                ? "border-secondary shadow-md ring-2 ring-secondary/20"
                : "border-neutral-dark",
            )}
          >
            <input
              type="radio"
              name="registration-path"
              value="business"
              checked={selectedPath === "business"}
              onChange={() => {
                setSelectedPath("business");
                setShowProfessionalNotice(false);
              }}
              className="sr-only"
            />
            <div
              className={cn(
                "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
                selectedPath === "business"
                  ? "bg-secondary text-white"
                  : "bg-neutral text-secondary",
              )}
            >
              <Building2 size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <span
              className={cn(
                "text-base font-semibold",
                selectedPath === "business" ? "text-secondary" : "text-primary",
              )}
            >
              Registrar mi negocio
            </span>
            <p className="mt-1 text-sm leading-snug text-primary-light/80">
              Crea una nueva empresa y gestiona agendamientos.
            </p>
          </label>

          {/* Card: Join as professional */}
          <label
            className={cn(
              "relative flex cursor-pointer flex-col rounded-xl border-2 bg-white p-5 transition-all",
              "hover:border-secondary/60 hover:shadow-sm",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2",
              selectedPath === "professional"
                ? "border-secondary shadow-md ring-2 ring-secondary/20"
                : "border-neutral-dark",
            )}
          >
            <input
              type="radio"
              name="registration-path"
              value="professional"
              checked={selectedPath === "professional"}
              onChange={() => setSelectedPath("professional")}
              className="sr-only"
            />
            <div
              className={cn(
                "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
                selectedPath === "professional"
                  ? "bg-secondary text-white"
                  : "bg-neutral text-secondary",
              )}
            >
              <UserPlus size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <span
              className={cn(
                "text-base font-semibold",
                selectedPath === "professional" ? "text-secondary" : "text-primary",
              )}
            >
              Unirme como profesional
            </span>
            <p className="mt-1 text-sm leading-snug text-primary-light/80">
              Únete a un negocio existente con un código de invitación.
            </p>
          </label>
        </div>

        {/* Professional path notice */}
        {showProfessionalNotice && (
          <div
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Próximamente — usá el código de invitación que te envió tu empleador. Si ya tenés
            cuenta, podés iniciar sesión.
          </div>
        )}

        {/* CTA */}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleContinue}
        >
          Continuar
          <ArrowRight size={16} strokeWidth={2} className="ml-2" aria-hidden="true" />
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-dark" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-neutral px-2 text-primary-light">O</span>
          </div>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-primary-light">
          Ya tengo cuenta,{" "}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 font-medium text-secondary transition hover:text-secondary-light"
          >
            Iniciar sesión
            <LogIn size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </p>

        {/* Terms */}
        <p className="text-center text-xs text-primary-light/70">
          Al continuar, aceptas nuestros{" "}
          <a
            href="https://agendateya.com/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary-light"
          >
            Términos de Servicio
          </a>{" "}
          y{" "}
          <a
            href="https://agendateya.com/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary-light"
          >
            Política de Privacidad
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  );
}
