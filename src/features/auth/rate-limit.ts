import { useEffect, useState } from "react";

import type { AppError } from "@/core/errors/app-error";

export const AUTH_RATE_LIMIT_SECONDS = 60;

export function isRateLimitError(error: Partial<AppError> | null | undefined) {
  return error?.status === 429 || error?.code === "RATE_LIMIT_EXCEEDED";
}

export function getRateLimitMessage(error: Partial<AppError> | null | undefined) {
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Demasiadas solicitudes. Intenta de nuevo en un momento.";
}

export function useRateLimitCooldown(defaultSeconds: number = AUTH_RATE_LIMIT_SECONDS) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  function startCooldown(seconds: number = defaultSeconds) {
    setRemainingSeconds((previous) => Math.max(previous, seconds));
  }

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    startCooldown,
  };
}