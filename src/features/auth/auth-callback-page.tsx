import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/shared/ui/button";
import { AuthLayout } from "./components/auth-layout";
import { useGoogleOAuthCallback } from "./use-google-oauth-callback";

export function AuthCallbackPage() {
  useGoogleOAuthCallback();
  const [oauthError, setOauthError] = useState<string | null>(null);

  const errorMessage = useMemo(() => {
    if (!oauthError) {
      return null;
    }

    const errorMessages: Record<string, string> = {
      cancelled: "Cancelaste la conexión con Google. Podés intentarlo nuevamente.",
      invalid_state: "No pudimos validar el estado de seguridad. Intentá iniciar sesión otra vez.",
      server_error: "Hubo un problema del servidor durante la autenticación con Google.",
    };

    return errorMessages[oauthError] ?? "No pudimos completar el inicio de sesión con Google.";
  }, [oauthError]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const search = currentUrl.searchParams;
    const hash = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : "");

    const hashError = hash.get("error");
    const legacyError = search.get("google") === "error" ? search.get("reason") : null;
    const nextError = hashError ?? legacyError;

    if (!nextError) {
      return;
    }

    setOauthError(nextError);

    const nextSearch = new URLSearchParams(search);
    nextSearch.delete("google");
    nextSearch.delete("reason");

    const nextHash = new URLSearchParams(hash);
    nextHash.delete("error");

    const nextSearchString = nextSearch.toString();
    const nextHashString = nextHash.toString();

    window.history.replaceState(
      {},
      "",
      `${currentUrl.pathname}${nextSearchString ? `?${nextSearchString}` : ""}${nextHashString ? `#${nextHashString}` : ""}`,
    );
  }, []);

  return (
    <AuthLayout>
      {errorMessage ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-900">No se pudo completar la conexión</h1>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg">Volver al login</Button>
            </Link>
            <Link to="/registro" search={{ plan: undefined }}>
              <Button size="lg" variant="outline">Crear cuenta</Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-neutral-dark bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-dark border-t-primary" />
          </div>
          <h1 className="text-xl font-semibold text-primary">Procesando acceso con Google</h1>
          <p className="mt-2 text-sm text-primary-light">Estamos validando tu sesión. Te redirigimos en un momento.</p>
        </section>
      )}
    </AuthLayout>
  );
}