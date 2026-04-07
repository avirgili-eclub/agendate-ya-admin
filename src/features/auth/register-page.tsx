import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PhoneInput } from "react-international-phone";

import type { AppError } from "@/core/errors/app-error";
import { register, startGoogleLogin } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { PasswordInput } from "@/shared/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { AuthLayout } from "./components/auth-layout";
import { GoogleButton } from "./components/google-button";
import { EmailVerificationBanner } from "./components/email-verification-banner";
import { getRateLimitMessage, isRateLimitError, useRateLimitCooldown } from "./rate-limit";
import { useGoogleOAuthCallback } from "./use-google-oauth-callback";

type RegisterStep = 1 | 2;

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

function getPyLocalDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withoutDialCode = digits.startsWith("595") ? digits.slice(3) : digits;
  return withoutDialCode;
}

function normalizePyPhone(phone: string) {
  let localDigits = getPyLocalDigits(phone);
  localDigits = localDigits.replace(/^0+/, "");
  localDigits = localDigits.slice(0, 9);
  return localDigits ? `+595${localDigits}` : "+595";
}

function toFriendlyRegisterMessage(appError: AppError) {
  if (appError.code === "RATE_LIMIT_EXCEEDED" || appError.status === 429) {
    return getRateLimitMessage(appError);
  }
  if (
    appError.code === "REQUEST_TIMEOUT" ||
    appError.code === "SERVICE_UNAVAILABLE" ||
    appError.status === 408 ||
    appError.status === 503
  ) {
    return "El servicio no esta disponible por ahora. Intentalo nuevamente en unos minutos.";
  }
  if (appError.code === "VALIDATION_ERROR" || appError.status === 400) {
    return "Revisa los datos del formulario y vuelve a intentar.";
  }
  if (appError.code === "UNAUTHORIZED" || appError.status === 401) {
    return "No se pudo completar el registro. Vuelve a intentarlo.";
  }
  if (appError.status === 409) {
    const lowerMessage = appError.message.toLowerCase();
    if (lowerMessage.includes("email")) {
      return "Ya existe una cuenta con este email.";
    }
    if (lowerMessage.includes("slug")) {
      return "Ese identificador ya esta en uso. Elige otro.";
    }
    return "Ya existe un registro con los datos ingresados.";
  }
  return "No pudimos completar el onboarding por ahora. Intentalo nuevamente.";
}

export function RegisterPage() {
  const navigate = useNavigate();

  useGoogleOAuthCallback();

  const [step, setStep] = useState<RegisterStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEmailVerificationBanner, setShowEmailVerificationBanner] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const { isCoolingDown, remainingSeconds, startCooldown } = useRateLimitCooldown();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"SERVICE" | "HOSPITALITY">("SERVICE");
  const [timezone, setTimezone] = useState("America/Asuncion");

  const [locationName, setLocationName] = useState("Sede Principal");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationPhone, setLocationPhone] = useState("+595");
  const [locationCountryIso2, setLocationCountryIso2] = useState("py");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const progressWidth = useMemo(() => (step === 1 ? "50%" : "100%"), [step]);
  const passwordRequirementStatus = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((rule) => ({
        key: rule.key,
        label: rule.label,
        isMet: rule.test(password),
      })),
    [password],
  );

  function validateStep1() {
    const nextErrors: Record<string, string> = {};
    if (!businessName.trim()) {
      nextErrors.businessName = "Ingresa el nombre del negocio.";
    }
    if (!timezone.trim()) {
      nextErrors.timezone = "Selecciona una zona horaria.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors: Record<string, string> = {};
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
    if (!fullName.trim()) {
      nextErrors.fullName = "Ingresa tu nombre completo.";
    }
    const normalizedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!normalizedEmail || !isValidEmail) {
      nextErrors.email = "Ingresa un email valido.";
    }
    const failedPasswordRules = PASSWORD_REQUIREMENTS.filter((rule) => !rule.test(password));
    if (failedPasswordRules.length > 0) {
      nextErrors.password = "La contrasena debe incluir mayuscula, minuscula, numero y minimo 8 caracteres.";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Las contrasenas no coinciden.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function toFieldErrors(appError: AppError) {
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
      if (detail.field.includes("location.name")) {
        nextErrors.locationName = detail.message;
      }
      if (detail.field.includes("location.address")) {
        nextErrors.locationAddress = detail.message;
      }
      if (detail.field.includes("location.phone")) {
        nextErrors.locationPhone = detail.message;
      }
      if (detail.field.includes("admin.fullName")) {
        nextErrors.fullName = detail.message;
      }
      if (detail.field.includes("admin.email")) {
        nextErrors.email = detail.message;
      }
      if (detail.field.includes("admin.password")) {
        nextErrors.password = detail.message;
      }
    }
    return nextErrors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordTouched(true);

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({
        business: {
          name: businessName,
          businessType,
          timezone,
        },
        location: {
          name: locationName,
          address: locationAddress,
          phone: locationPhone,
        },
        admin: {
          email,
          password,
          fullName,
        },
      });
      
      // Show email verification banner
      setShowEmailVerificationBanner(true);
      setUserEmail(email);

      await navigate({ to: "/" });
    } catch (e) {
      const appError = e as Partial<AppError>;
      const normalizedError: AppError = {
        code: (appError.code as AppError["code"]) ?? "UNKNOWN_ERROR",
        status: typeof appError.status === "number" ? appError.status : 500,
        message: typeof appError.message === "string" ? appError.message : "Unexpected error",
        details: Array.isArray(appError.details) ? appError.details : [],
      };
      if (isRateLimitError(normalizedError)) {
        startCooldown();
      }
      setFieldErrors((prev) => ({ ...prev, ...toFieldErrors(normalizedError) }));
      setError(toFriendlyRegisterMessage(normalizedError));
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (isCoolingDown) {
      return;
    }
    startCooldown();
    startGoogleLogin("/dashboard");
  }

  return (
    <AuthLayout showTestimonial={false}>
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Onboarding AgendateYA</p>
          <h1 className="mt-2 text-3xl font-bold text-primary">Crea tu cuenta</h1>
          <p className="mt-2 text-sm text-primary-light">
            Configuramos tu negocio, tu sede y tu usuario en un único flujo.
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-dark">
            <div
              className="h-full bg-secondary transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium text-primary-light">
            <span>Paso {step} de 2</span>
            <span>{step === 1 ? "Información del negocio" : "Datos de administrador"}</span>
          </div>
        </div>

        {showEmailVerificationBanner ? (
          <EmailVerificationBanner
            email={userEmail}
            onDismiss={() => setShowEmailVerificationBanner(false)}
          />
        ) : null}

        {error ? (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step === 2 && (
          <div className="mt-6">
            <GoogleButton onClick={handleGoogleLogin} disabled={isCoolingDown}>
              Continuar con Google
            </GoogleButton>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-dark" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral px-2 text-primary-light">O completa el formulario</span>
              </div>
            </div>
          </div>
        )}

        <form className="mt-6" onSubmit={onSubmit}>
          {step === 1 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Nombre del negocio</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  name="businessName"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mi Barbería"
                />
                {fieldErrors.businessName ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.businessName}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Tipo de negocio</span>
                <Select value={businessType} onValueChange={(value) => setBusinessType(value as "SERVICE" | "HOSPITALITY")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICE">Servicios</SelectItem>
                    <SelectItem value="HOSPITALITY">Hospitalidad</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Zona horaria</span>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((timezoneOption) => (
                      <SelectItem key={timezoneOption.value} value={timezoneOption.value}>
                        {timezoneOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.timezone ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.timezone}
                  </span>
                ) : null}
              </label>

              <div className="flex justify-between gap-3 pt-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary-light transition hover:text-primary"
                >
                  Ya tengo cuenta
                </Link>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    setError(null);
                    if (!validateStep1()) {
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Nombre de la sede</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  name="locationName"
                  autoComplete="organization"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Sede Principal"
                />
                {fieldErrors.locationName ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.locationName}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Dirección</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  name="locationAddress"
                  autoComplete="street-address"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Av. Mariscal Lopez 1234"
                />
                {fieldErrors.locationAddress ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.locationAddress}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Teléfono de contacto</span>
                <div className="register-phone-wrapper ring-primary-light focus-within:ring-2">
                  <PhoneInput
                    defaultCountry="py"
                    preferredCountries={["py", "ar", "br", "cl", "uy"]}
                    disableDialCodeAndPrefix
                    showDisabledDialCodeAndPrefix
                    defaultMask="(...) ... - ..."
                    placeholder="(981) 123 - 456"
                    value={locationPhone}
                    onChange={(phone, meta) => {
                      const nextPhone = meta.country.iso2 === "py" ? normalizePyPhone(phone) : phone;
                      setLocationPhone(nextPhone);
                      setLocationCountryIso2(meta.country.iso2);
                    }}
                    className="register-phone-root"
                    inputClassName="register-phone-input"
                    inputProps={{
                      name: "locationPhone",
                      autoComplete: "tel",
                    }}
                    countrySelectorStyleProps={{
                      buttonClassName: "register-phone-country-button",
                      flagClassName: "register-phone-flag",
                      dropdownArrowClassName: "register-phone-country-arrow",
                      dropdownStyleProps: {
                        className: "register-phone-country-dropdown",
                        listItemClassName: "register-phone-country-item",
                        listItemSelectedClassName: "register-phone-country-item-selected",
                        listItemFocusedClassName: "register-phone-country-item-focused",
                      },
                    }}
                  />
                </div>
                {fieldErrors.locationPhone ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.locationPhone}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Tu nombre completo</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Perez"
                />
                {fieldErrors.fullName ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.fullName}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Email administrador</span>
                <input
                  className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light transition focus:border-primary focus:ring-2"
                  name="adminEmail"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@minegocio.com"
                />
                {fieldErrors.email ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.email}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Contraseña</span>
                <PasswordInput
                  name="adminPassword"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="Mínimo 8 caracteres"
                />
                {fieldErrors.password ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.password}
                  </span>
                ) : null}
                <p className="mt-1 text-xs text-primary-light">Tu contraseña debe cumplir:</p>
                <ul className="mt-1 space-y-1">
                  {passwordRequirementStatus.map((ruleStatus) => (
                    <li
                      key={ruleStatus.key}
                      className={
                        passwordTouched && !ruleStatus.isMet
                          ? "text-xs text-red-700"
                          : ruleStatus.isMet
                            ? "text-xs text-success-dark"
                            : "text-xs text-primary-light"
                      }
                    >
                      {ruleStatus.label}
                    </li>
                  ))}
                </ul>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary-dark">Confirmar contraseña</span>
                <PasswordInput
                  name="adminPasswordConfirm"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                />
                {fieldErrors.confirmPassword ? (
                  <span role="alert" className="mt-1 block text-xs text-red-700">
                    {fieldErrors.confirmPassword}
                  </span>
                ) : null}
              </label>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
                  Volver
                </Button>
                <Button type="submit" size="lg" disabled={isLoading || isCoolingDown}>
                  {isLoading ? "Creando..." : isCoolingDown ? `Espera ${remainingSeconds}s` : "Crear cuenta"}
                </Button>
              </div>

              {isCoolingDown ? (
                <p className="text-center text-xs text-secondary">
                  Limite temporal alcanzado. Espera {remainingSeconds}s para continuar.
                </p>
              ) : null}
            </div>
          )}
        </form>
      </div>
    </AuthLayout>
  );
}
