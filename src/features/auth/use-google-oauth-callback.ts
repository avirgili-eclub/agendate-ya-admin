import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { setSessionState, setOnboardingTokens, decodeJwt } from "@/core/auth/session-store";

/**
 * Hook to handle Google OAuth callback tokens in URL
 * Must be called on routes that receive Google OAuth redirects
 */
export function useGoogleOAuthCallback() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const search = currentUrl.searchParams;
    const hash = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : "");

    const token = hash.get("token") ?? search.get("token");
    const refresh = hash.get("refresh") ?? search.get("refresh");

    if (!token || !refresh) {
      return;
    }

    const returnUrlRaw = hash.get("returnUrl") ?? search.get("returnUrl");
    const onboardingPendingRaw = hash.get("onboarding_pending") ?? search.get("onboarding_pending");

    const nextSearch = new URLSearchParams(search);
    nextSearch.delete("token");
    nextSearch.delete("refresh");
    nextSearch.delete("onboarding_pending");

    const nextHash = new URLSearchParams(hash);
    nextHash.delete("token");
    nextHash.delete("refresh");
    nextHash.delete("onboarding_pending");

    const nextSearchString = nextSearch.toString();
    const nextHashString = nextHash.toString();

    // IMPORTANT: Remove tokens from URL immediately (security)
    window.history.replaceState(
      {},
      "",
      `${currentUrl.pathname}${nextSearchString ? `?${nextSearchString}` : ""}${nextHashString ? `#${nextHashString}` : ""}`,
    );

    // Decode JWT payload (base64 — no verification needed client-side)
    const payload = decodeJwt(token);
    if (!payload) {
      console.error("Failed to decode JWT token");
      return;
    }

    const onboardingPending =
      onboardingPendingRaw == null ? payload.onboarding_pending === true : onboardingPendingRaw === "true";

    const targetReturnUrl =
      typeof returnUrlRaw === "string" && returnUrlRaw.startsWith("/") ? returnUrlRaw : "/dashboard";

    if (onboardingPending) {
      // Store tokens temporarily in sessionStorage — needed for onboarding/complete
      setOnboardingTokens(token, refresh);
      // Navigate to onboarding screen
      void navigate({ to: "/onboarding" });
    } else {
      // Full session — store normally in sessionStorage and proceed
      setSessionState({
        accessToken: token,
        refreshToken: refresh,
        user: {
          id: payload.sub as string,
          email: (payload.email as string) ?? "",
          fullName: ((payload.name as string) ?? (payload.fullName as string) ?? "").trim(),
          role: payload.role as string,
          emailVerified: true, // Google users are always verified
          resourceId: payload.rid ? (payload.rid as string) : undefined,
        },
      });
      void navigate({ to: targetReturnUrl });
    }
  }, [location.pathname, location.searchStr, location.hash, navigate]);
}
