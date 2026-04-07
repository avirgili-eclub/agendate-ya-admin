import { useState } from "react";
import { X } from "lucide-react";
import type { AppError } from "@/core/errors/app-error";
import { resendConfirmation } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { getRateLimitMessage, isRateLimitError, useRateLimitCooldown } from "../rate-limit";

type EmailVerificationBannerProps = {
  email: string;
  onDismiss: () => void;
};

export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const { isCoolingDown, remainingSeconds, startCooldown } = useRateLimitCooldown();

  async function handleResend() {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      await resendConfirmation(email);
      setResendSuccess(true);
    } catch (error) {
      const appError = error as AppError;
      if (isRateLimitError(appError)) {
        setResendError(getRateLimitMessage(appError));
        startCooldown();
        return;
      }
      // Always show success (anti-enumeration)
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div
      role="alert"
      className="relative rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
    >
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 transition hover:bg-blue-100"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="pr-8">
        <strong>Verifica tu cuenta</strong> — Te enviamos un email a <strong>{email}</strong>.
        {resendSuccess ? (
          <span className="ml-2 text-green-700">Email reenviado con éxito.</span>
        ) : null}
      </p>

      {resendError ? <p className="mt-2 text-xs text-red-700">{resendError}</p> : null}

      <Button
        variant="outline"
        size="sm"
        className="mt-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
        onClick={handleResend}
        disabled={isResending || resendSuccess || isCoolingDown}
      >
        {isResending
          ? "Reenviando..."
          : isCoolingDown
            ? `Espera ${remainingSeconds}s`
            : resendSuccess
              ? "Email reenviado"
              : "Reenviar email"}
      </Button>
    </div>
  );
}
