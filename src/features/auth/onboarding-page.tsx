import { FormEvent, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PhoneInput } from "react-international-phone";

import type { AppError } from "@/core/errors/app-error";
import { completeOnboarding } from "@/core/auth/auth-service";
import { clearOnboardingTokens } from "@/core/auth/session-store";
import { fetchBusinessSubTypes } from "@/shared/lib/business-subtypes";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { AuthLayout } from "./components/auth-layout";

const TIMEZONE_OPTIONS = [
  { value: "America/Asuncion", label: "Asuncion (UTC-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "America/Montevideo", label: "Montevideo (UTC-3)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (UTC-3)" },
  { value: "America/Santiago", label: "Santiago (UTC-4)" },
  { value: "America/Lima", label: "Lima (UTC-5)" },
  { value: "America/Bogota", label: "Bogota (UTC-5)" },
  { value: "America/La_Paz", label: "La Paz (UTC-4)" },
  { value: "America/Caracas", label: "Caracas (UTC-4)" },
  { value: "America/Mexico_City", label: "Ciudad de Mexico (UTC-6)" },
];

function getPyLocalDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withoutDialCode = digits.startsWith("595") ? digits.slice(3) : digits;
  return withoutDialCode;
}

function toFriendlyOnboardingMessage(appError: AppError) {
  if (appError.status === 409) {
    return "El onboarding ya fue completado. Redirigiendo al panel...";
  }
  if (appError.status === 401) {
    return "Tu sesion expiro. Redirigiendo a inicio de sesion...";
  }
  if (appError.status === 400) {
    return "Revisa los datos del formulario y vuelve a intentar.";
  }
  return "No pudimos completar el onboarding. Intentalo nuevamente.";
}

function toOnboardingFieldErrors(appError: AppError) {
  const nextErrors: Record<string, string> = {};
  const details = Array.isArray(appError.details) ? appError.details : [];

  for (const detail of details) {
    if (!detail.field) {
      continue;
    }

    if (detail.field.includes("business.name")) {
      nextErrors.businessName = detail.message;
    }
    if (detail.field.includes("business.timezone")) {
      nextErrors.timezone = detail.message;
    }
    if (detail.field.includes("business.businessSubType") || detail.field.includes("business.subType")) {
      nextErrors.businessSubType = detail.message;
    }
    if (detail.field.includes("location.name")) {
      nextErrors.locationName = detail.message;
    }
    if (detail.field.includes("location.address")) {
      nextErrors.locationAddress = detail.message;
    }
    if (detail.field.includes("location.phone")) {
      nextErrors.locationPhone = detail.message;
    }
  }

  return nextErrors;
}

export function OnboardingPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [businessName, setBusinessName] = useState("");
  const [businessSubType, setBusinessSubType] = useState("OTHER");
  const [timezone, setTimezone] = useState("America/Asuncion");

  const [locationName, setLocationName] = useState("Sede Principal");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationPhone, setLocationPhone] = useState("+595");
  const [locationCountryIso2, setLocationCountryIso2] = useState("py");

  const businessSubTypesQuery = useQuery({
    queryKey: ["business-subtypes"],
    queryFn: fetchBusinessSubTypes,
    staleTime: 5 * 60 * 1000,
  });
  const businessSubTypeOptions = businessSubTypesQuery.data ?? [];

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!businessName.trim()) {
      nextErrors.businessName = "Ingresa el nombre del negocio.";
    }
    if (!businessSubType.trim()) {
      nextErrors.businessSubType = "Selecciona una especialidad.";
    }
    if (!timezone.trim()) {
      nextErrors.timezone = "Selecciona una zona horaria.";
    }
    if (!locationName.trim()) {
      nextErrors.locationName = "Ingresa un nombre para la sede.";
    }
    if (!locationAddress.trim()) {
      nextErrors.locationAddress = "Ingresa la direccion de la sede.";
    }
    if (!locationPhone || !isValidPhoneNumber(locationPhone)) {
      nextErrors.locationPhone = "Ingresa un telefono valido.";
    }
    if (locationCountryIso2 === "py" && !locationPhone.startsWith("+595")) {
      nextErrors.locationPhone = "El telefono debe corresponder a Paraguay (+595).";
    }
    if (locationCountryIso2 === "py") {
      const pyLocalDigits = getPyLocalDigits(locationPhone);
      if (pyLocalDigits.length !== 9) {
        nextErrors.locationPhone = "Ingresa 9 digitos para Paraguay (sin contar +595).";
      } else if (pyLocalDigits.startsWith("0")) {
        nextErrors.locationPhone = "El primer digito no puede ser 0.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await completeOnboarding({
        business: {
          name: businessName,
          businessSubType,
          timezone,
        },
        location: {
          name: locationName,
          address: locationAddress,
          phone: locationPhone,
        },
      });
      await navigate({ to: "/dashboard" });
    } catch (e) {
      const appError = e as AppError;

      if (appError.status === 400) {
        const nextErrors = toOnboardingFieldErrors(appError);
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
        }
      }

      if (appError.status === 401) {
        clearOnboardingTokens();
        await navigate({ to: "/login", search: { reason: "session-expired" } });
        return;
      }

      if (appError.status === 409) {
        await navigate({ to: "/dashboard" });
        return;
      }

      setError(toFriendlyOnboardingMessage(appError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-primary">Completa tu perfil</h1>
          <p className="mt-2 text-sm text-primary-light">
            Datos de tu negocio para empezar a usar AgendateYA.
          </p>
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
            <div>
              <h3 className="mb-3 text-sm font-semibold text-primary">Informacion del Negocio</h3>

              <label className="block mb-4">
                <span className="mb-1 block text-sm font-medium text-primary-dark">
                  Nombre del negocio
                </span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej: Salon de Belleza Maria"
                  required
                />
                {fieldErrors.businessName ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.businessName}</span>
                ) : null}
              </label>

              <label className="block mb-4">
                <span className="mb-1 block text-sm font-medium text-primary-dark">
                  Especialidad del negocio
                </span>
                <Select value={businessSubType} onValueChange={setBusinessSubType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessSubTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.businessSubType ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.businessSubType}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">
                  Zona horaria
                </span>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.timezone ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.timezone}</span>
                ) : null}
              </label>
            </div>

            <div className="pt-4 border-t border-neutral-dark/30">
              <h3 className="mb-3 text-sm font-semibold text-primary">Primera Sede</h3>

              <label className="block mb-4">
                <span className="mb-1 block text-sm font-medium text-primary-dark">
                  Nombre de la sede
                </span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ej: Sucursal Centro"
                  required
                />
                {fieldErrors.locationName ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.locationName}</span>
                ) : null}
              </label>

              <label className="block mb-4">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Direccion</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Calle y numero"
                  required
                />
                {fieldErrors.locationAddress ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.locationAddress}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Telefono</span>
                <PhoneInput
                  defaultCountry={locationCountryIso2}
                  value={locationPhone}
                  onChange={(phone, meta) => {
                    setLocationPhone(phone);
                    setLocationCountryIso2(meta.country.iso2);
                  }}
                  inputClassName="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                />
                {fieldErrors.locationPhone ? (
                  <span className="mt-1 text-xs text-red-600">{fieldErrors.locationPhone}</span>
                ) : null}
              </label>
            </div>

            <Button className="w-full" type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Completando..." : "Completar Onboarding"}
            </Button>
          </form>
        </section>
      </div>
    </AuthLayout>
  );
}
