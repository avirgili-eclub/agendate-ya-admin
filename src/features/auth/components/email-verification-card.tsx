import { useState, type ReactNode } from "react";
import { MailCheck } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { resendConfirmation } from "@/core/auth/auth-service";
import { Button } from "@/shared/ui/button";
import { getRateLimitMessage, isRateLimitError, useRateLimitCooldown } from "../rate-limit";

type EmailVerificationCardProps = {
  title: string;
  description: string;
  email: string;
  resendButtonLabel?: string;
  resendSuccessMessage?: string;
  resendDisabled?: boolean;
  resendDisabledMessage?: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: ReactNode;
};

export function EmailVerificationCard({
  title,
  description,
  email,
  resendButtonLabel = "Reenviar correo de confirmacion",
  resendSuccessMessage = "Si el email existe y no esta verificado, recibiras un nuevo enlace.",
  resendDisabled = false,
  resendDisabledMessage,
  onBack,
  backLabel = "Volver",
  footer,
}: EmailVerificationCardProps) {
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasResentSuccessfully, setHasResentSuccessfully] = useState(false);
  const { isCoolingDown, remainingSeconds, startCooldown } = useRateLimitCooldown();

  async function handleResend() {
    setIsResending(true);
    setFeedback(null);

    try {
      await resendConfirmation(email.trim());
      setHasResentSuccessfully(true);
      setFeedback(resendSuccessMessage);
    } catch (error) {
      const appError = error as AppError;
      if (isRateLimitError(appError)) {
        setFeedback(getRateLimitMessage(appError));
        startCooldown(appError.retryAfterSeconds);
        return;
      }
      setHasResentSuccessfully(true);
      setFeedback(resendSuccessMessage);
    } finally {
      setIsResending(false);
    }
  }

  const isResendBlocked = resendDisabled || isCoolingDown;

  return (
    <section className="rounded-xl border border-neutral-dark bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
      </div>

      <h1 className="text-center text-2xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-center text-sm text-primary-light">{description}</p>

      <div className="mt-4 rounded-md border border-neutral-dark/70 bg-neutral-light px-3 py-2 text-center text-sm text-primary-dark">
        <strong className="break-all">{email}</strong>
      </div>

      <Button
        type="button"
        className="mt-4 w-full"
        size="lg"
        onClick={handleResend}
        disabled={isResending || isResendBlocked}
      >
        {isResending
          ? "Reenviando..."
          : isCoolingDown
            ? `Espera ${remainingSeconds}s`
            : hasResentSuccessfully
              ? "Correo reenviado"
              : resendButtonLabel}
      </Button>

      {resendDisabledMessage && resendDisabled ? (
        <p className="mt-2 text-center text-xs text-primary-light">{resendDisabledMessage}</p>
      ) : null}

      {feedback ? (
        <p className="mt-2 text-center text-xs text-primary-light">{feedback}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-primary-light">
          Revisa tambien la carpeta de spam o promociones.
        </p>
      )}

      {onBack ? (
        <Button type="button" variant="outline" className="mt-3 w-full" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
