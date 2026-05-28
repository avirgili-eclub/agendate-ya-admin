import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, RefreshCw, Unlink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  canManageWhatsappBusinessConnection,
  canViewWhatsappBusinessStatus,
  disconnectWhatsappBusiness,
  fetchWhatsappBusinessStatus,
  getWhatsappBusinessCapabilityLabels,
  getWhatsappBusinessStatusLabel,
  getWhatsappBusinessStatusTone,
  needsInboundRetry,
  retryInboundWebhook,
  startWhatsappBusinessOnboarding,
  toWhatsappBusinessFriendlyMessage,
  whatsappBusinessKeys,
  WHATSAPP_INBOUND_WEBHOOK_POLL_INTERVAL_MS,
  WHATSAPP_INBOUND_WEBHOOK_POLL_TIMEOUT_MS,
  WHATSAPP_NOT_CONFIGURED,
  INBOUND_WEBHOOK_REGISTRATION_FAILED,
  type WhatsappBusinessStatusTone,
  type WhatsappBusinessStatusData,
} from "@/features/whatsapp-business/whatsapp-business-service";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useFeedback } from "@/shared/notifications/use-feedback";

const WHATSAPP_GREEN = "bg-[#25D366] hover:bg-[#1ebe5d] focus-visible:ring-[#25D366]/30";
const WHATSAPP_POPUP_NAME = "wa-onboarding";
const WHATSAPP_POPUP_WIDTH = 600;
const WHATSAPP_POPUP_HEIGHT = 750;
const WHATSAPP_CONNECT_COOLDOWN_SECONDS = 5;

type WhatsappActivationState = "idle" | "polling" | "connected" | "timeout" | "failed";

type InboundWebhookPollState = "idle" | "polling" | "registered" | "timeout";

type WhatsappBusinessIntegrationCardProps = {
  whatsappAvailable?: boolean;
  capabilitiesLoading?: boolean;
  activationState?: WhatsappActivationState;
  inboundPollState?: InboundWebhookPollState;
  onInboundPollStateChange?: (state: InboundWebhookPollState) => void;
};

function toChipTone(tone: WhatsappBusinessStatusTone) {
  if (tone === "muted") {
    return "neutral";
  }

  return tone;
}

function getStateCopy(params: {
  activationState: WhatsappActivationState;
  statusLabel: string;
  isConnected: boolean | undefined;
}) {
  const { activationState, statusLabel, isConnected } = params;

  if (activationState === "polling") {
    return "Estamos terminando de activar tu WhatsApp Business. Esto puede tardar unos segundos.";
  }

  if (activationState === "timeout") {
    return "La conexión sigue en proceso. Refrescá el estado en unos segundos.";
  }

  if (activationState === "failed") {
    return "No se pudo completar la conexión. Podés intentarlo de nuevo.";
  }

  if (isConnected) {
    return "Tu WhatsApp Business está listo para enviar y recibir mensajes.";
  }

  if (statusLabel === "Pendiente") {
    return "Conexión en proceso. Podés reanudar la configuración cuando quieras.";
  }

  if (statusLabel === "Requiere atención") {
    return "Hubo un problema con la conexión. Reintentá o contactanos si persiste.";
  }

  return "Conectá WhatsApp Business sin cargar números manualmente.";
}

function getStatusPanelClass(tone: WhatsappBusinessStatusTone) {
  if (tone === "success") {
    return "border-green-200 bg-green-50";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50";
  }

  if (tone === "danger") {
    return "border-red-200 bg-red-50";
  }

  return "border-neutral-dark bg-neutral";
}

function getPopupFeatures() {
  if (typeof window === "undefined") {
    return "width=600,height=750";
  }

  const left = Math.max(0, Math.round((window.screen.width - WHATSAPP_POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round((window.screen.height - WHATSAPP_POPUP_HEIGHT) / 2));
  return `width=${WHATSAPP_POPUP_WIDTH},height=${WHATSAPP_POPUP_HEIGHT},left=${left},top=${top}`;
}

function writePopupLoadingState(popup: Window) {
  try {
    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <title>Conectando WhatsApp Business</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Inter, system-ui, sans-serif; background: #f7fafc; color: #1a365d; }
            main { width: min(420px, calc(100vw - 32px)); border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; padding: 28px; text-align: center; box-shadow: 0 12px 32px rgba(16, 42, 76, 0.12); }
            .icon { width: 48px; height: 48px; margin: 0 auto 14px; border-radius: 999px; background: rgba(37, 211, 102, 0.15); color: #128C7E; display: grid; place-items: center; font-size: 24px; }
            h1 { margin: 0 0 8px; font-size: 18px; }
            p { margin: 0; font-size: 14px; line-height: 1.5; color: #2c4f82; }
          </style>
        </head>
        <body>
          <main>
            <div class="icon" aria-hidden="true">●</div>
            <h1>Preparando conexión</h1>
            <p>Estamos abriendo la configuración segura de WhatsApp Business. No cierres esta ventana.</p>
          </main>
        </body>
      </html>
    `);
    popup.document.close();
  } catch {
    // Some browsers can restrict about:blank document writes; the popup can still navigate later.
  }
}

function openWhatsappOnboardingPopup() {
  if (typeof window === "undefined") {
    return null;
  }

  const popup = window.open("about:blank", WHATSAPP_POPUP_NAME, getPopupFeatures());
  if (popup) {
    popup.focus();
    writePopupLoadingState(popup);
  }
  return popup;
}

export function WhatsappBusinessIntegrationCard({
  whatsappAvailable = true,
  capabilitiesLoading = false,
  activationState = "idle",
  inboundPollState = "idle",
  onInboundPollStateChange,
}: WhatsappBusinessIntegrationCardProps) {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const canView = canViewWhatsappBusinessStatus(session.user?.role);
  const canManage = canManageWhatsappBusinessConnection(session.user?.role);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fallbackSetupLinkUrl, setFallbackSetupLinkUrl] = useState<string | null>(null);
  const [connectCooldownSeconds, setConnectCooldownSeconds] = useState(0);
  const [inboundRetryDetail, setInboundRetryDetail] = useState<string | null>(null);
  const popupWatcherRef = useRef<number | undefined>(undefined);
  const connectCooldownTimerRef = useRef<number | undefined>(undefined);
  const connectClickLockedRef = useRef(false);
  const inboundPollTimeoutRef = useRef<number | undefined>(undefined);

  const statusQuery = useQuery({
    queryKey: whatsappBusinessKeys.status(),
    queryFn: fetchWhatsappBusinessStatus,
    enabled: canView && whatsappAvailable,
  });

  const status = statusQuery.data;
  const isConnected = status?.connected || status?.status === "ACTIVE" || status?.status === "CONNECTED";
  const statusLabel = status ? getWhatsappBusinessStatusLabel(status.status) : "Sin conectar";
  const statusTone = getWhatsappBusinessStatusTone(status?.status ?? "NOT_CONNECTED");
  const stateCopy = getStateCopy({ activationState, statusLabel, isConnected });
  const capabilityLabels = useMemo(() => (status ? getWhatsappBusinessCapabilityLabels(status) : []), [status]);

  function clearPopupWatcher() {
    if (popupWatcherRef.current !== undefined) {
      window.clearInterval(popupWatcherRef.current);
      popupWatcherRef.current = undefined;
    }
  }

  function clearConnectCooldown() {
    if (connectCooldownTimerRef.current !== undefined) {
      window.clearInterval(connectCooldownTimerRef.current);
      connectCooldownTimerRef.current = undefined;
    }
    connectClickLockedRef.current = false;
  }

  function startConnectCooldown() {
    clearConnectCooldown();
    connectClickLockedRef.current = true;
    setConnectCooldownSeconds(WHATSAPP_CONNECT_COOLDOWN_SECONDS);

    connectCooldownTimerRef.current = window.setInterval(() => {
      setConnectCooldownSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          clearConnectCooldown();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);
  }

  function closePopup(popup: Window | null) {
    if (!popup || popup.closed) return;
    popup.close();
  }

  function watchPopupClosure(popup: Window) {
    clearPopupWatcher();
    popupWatcherRef.current = window.setInterval(() => {
      if (!popup.closed) return;
      clearPopupWatcher();
      void queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      clearPopupWatcher();
      clearConnectCooldown();
    };
  }, []);

  function clearInboundPollTimeout() {
    if (inboundPollTimeoutRef.current !== undefined) {
      window.clearTimeout(inboundPollTimeoutRef.current);
      inboundPollTimeoutRef.current = undefined;
    }
  }

  useEffect(() => {
    return () => {
      clearInboundPollTimeout();
    };
  }, []);

  useEffect(() => {
    if (inboundPollState !== "polling" || !canView || !whatsappAvailable) {
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    async function pollInbound() {
      if (cancelled) return;

      try {
        const latestStatus = await queryClient.fetchQuery({
          queryKey: whatsappBusinessKeys.status(),
          queryFn: fetchWhatsappBusinessStatus,
        });

        if (cancelled) return;

        const webhookStatus = latestStatus.inboundWebhookStatus;
        if (webhookStatus === "REGISTERED") {
          onInboundPollStateChange?.("registered");
          showFeedback("success", "Listo, tu bot ya puede recibir mensajes.", { persist: false });
          return;
        }

        if (webhookStatus === "FAILED" || webhookStatus === "NOT_REGISTERED" || webhookStatus === null) {
          onInboundPollStateChange?.("idle");
          return;
        }
      } catch {
        // Keep polling until bounded timeout
      }

      if (Date.now() - startedAt >= WHATSAPP_INBOUND_WEBHOOK_POLL_TIMEOUT_MS) {
        onInboundPollStateChange?.("timeout");
        return;
      }

      inboundPollTimeoutRef.current = window.setTimeout(pollInbound, WHATSAPP_INBOUND_WEBHOOK_POLL_INTERVAL_MS);
    }

    void pollInbound();

    return () => {
      cancelled = true;
      clearInboundPollTimeout();
    };
  }, [inboundPollState, canView, whatsappAvailable, queryClient, showFeedback, onInboundPollStateChange]);

  const startOnboardingMutation = useMutation({
    mutationFn: async (popup: Window | null) => {
      const response = await startWhatsappBusinessOnboarding();
      return { popup, response };
    },
    onSuccess: ({ popup, response }) => {
      if (popup && !popup.closed) {
        popup.location.href = response.setupLinkUrl;
        watchPopupClosure(popup);
        return;
      }

      setFallbackSetupLinkUrl(response.setupLinkUrl);
      showFeedback(
        "warning",
        "Tu navegador bloqueó la ventana emergente. Podés continuar la conexión en esta pestaña.",
      );
    },
    onError: async (error, popup) => {
      closePopup(popup);
      clearPopupWatcher();
      const appError = error as unknown as AppError;
      if (appError.code === "WHATSAPP_ALREADY_CONNECTED") {
        await queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
      }
      showFeedback("error", toWhatsappBusinessFriendlyMessage(appError));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsappBusiness,
    onSuccess: async () => {
      setIsConfirmOpen(false);
      showFeedback("success", "WhatsApp Business desconectado correctamente.");
      await queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
    },
    onError: (error) => {
      showFeedback("error", toWhatsappBusinessFriendlyMessage(error as unknown as AppError));
    },
  });

  const retryInboundMutation = useMutation({
    mutationFn: retryInboundWebhook,
    onSuccess: async (updatedStatus) => {
      setInboundRetryDetail(null);
      queryClient.setQueryData(whatsappBusinessKeys.status(), updatedStatus);
      const webhookStatus = updatedStatus.inboundWebhookStatus;
      if (webhookStatus === "REGISTERED") {
        onInboundPollStateChange?.("registered");
        showFeedback("success", "Listo, tu bot ya puede recibir mensajes.", { persist: false });
      } else if (webhookStatus === "PENDING") {
        onInboundPollStateChange?.("polling");
      }
      await queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      if (appError.code === WHATSAPP_NOT_CONFIGURED) {
        setInboundRetryDetail(null);
        queryClient.setQueryData(whatsappBusinessKeys.status(), (currentStatus: WhatsappBusinessStatusData | undefined) => {
          const current = currentStatus;

          if (!current) return currentStatus;

          return {
            ...current,
            connected: false,
            status: "DISCONNECTED",
            inboundEnabled: false,
            outboundEnabled: false,
            phoneNumberId: null,
            displayPhoneNumber: null,
            displayName: null,
            inboundWebhookStatus: null,
          };
        });
        showFeedback("error", "No hay número activo para reintentar");
        void queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
        return;
      }
      if (appError.code === INBOUND_WEBHOOK_REGISTRATION_FAILED || appError.status === 502) {
        const detail = appError.message?.trim() || "Error desconocido";
        const truncated = detail.length > 200 ? `${detail.slice(0, 200)}...` : detail;
        setInboundRetryDetail(truncated);
        return;
      }
      setInboundRetryDetail(null);
      if (appError.status >= 500) {
        showFeedback("error", "No pudimos contactar al servidor, probá de nuevo en unos segundos.");
        return;
      }
      showFeedback("error", toWhatsappBusinessFriendlyMessage(appError));
    },
  });

  const canStartOnboarding = canManage && whatsappAvailable && !isConnected;
  const isConnectCooldownActive = connectCooldownSeconds > 0;
  const isConnectButtonBusy = startOnboardingMutation.isPending || isConnectCooldownActive;
  const isConnectButtonDisabled = !canStartOnboarding || isConnectButtonBusy || activationState === "polling";
  const connectButtonClass = isConnectButtonBusy
    ? "w-full bg-slate-200 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300 disabled:opacity-100 sm:w-auto"
    : `${WHATSAPP_GREEN} w-full text-white sm:w-auto`;
  const connectButtonLabel = isConnectCooldownActive
    ? `Preparando conexión (${connectCooldownSeconds}s)`
    : startOnboardingMutation.isPending
      ? "Abriendo WhatsApp..."
      : "Conectar WhatsApp";
  const connectButtonAriaLabel = isConnectCooldownActive
    ? `Conectar WhatsApp Business. Esperá ${connectCooldownSeconds} segundos.`
    : "Conectar WhatsApp Business";

  const webhookStatus = status?.inboundWebhookStatus;
  const showInboundRetryBanner =
    needsInboundRetry(status) || (status?.connected && webhookStatus === "PENDING" && inboundPollState === "timeout");
  const isInboundPending = (webhookStatus === "PENDING" && inboundPollState !== "timeout") || inboundPollState === "polling";
  const isInboundRegistered = status?.connected && webhookStatus === "REGISTERED";

  useEffect(() => {
    if (!showInboundRetryBanner) {
      setInboundRetryDetail(null);
    }
  }, [showInboundRetryBanner]);

  function handleStartOnboarding() {
    if (!canStartOnboarding || connectClickLockedRef.current || startOnboardingMutation.isPending || activationState === "polling") {
      return;
    }

    setFallbackSetupLinkUrl(null);
    startConnectCooldown();
    const popup = openWhatsappOnboardingPopup();
    if (!popup) {
      showFeedback("warning", "Tu navegador bloqueó la ventana emergente. Estamos preparando una alternativa.");
    }
    startOnboardingMutation.mutate(popup);
  }

  function handleFallbackRedirect() {
    if (!fallbackSetupLinkUrl) return;
    window.location.href = fallbackSetupLinkUrl;
  }

  function handleRetryInbound() {
    if (retryInboundMutation.isPending) return;
    setInboundRetryDetail(null);
    retryInboundMutation.mutate();
  }

  return (
    <PageCard className="flex flex-col overflow-hidden">
      <div className="flex items-start gap-3 border-b border-neutral-dark pb-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
          <MessageCircle className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-primary">WhatsApp Business</h2>
          <p className="text-xs text-primary-light">
            Conectá tu WhatsApp Business para enviar y recibir mensajes con tus clientes.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

        {capabilitiesLoading && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4" role="status" aria-live="polite">
            <p className="text-sm text-primary-light">Verificando disponibilidad...</p>
          </div>
        )}

        {!capabilitiesLoading && !whatsappAvailable && (
          <FeedbackBanner
            tone="warning"
            message="Tu plan actual no incluye WhatsApp Business. Actualizá tu suscripción para activarlo."
          />
        )}

        {!canView && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
            <p className="text-sm text-primary-light">Esta integración solo es visible para administradores.</p>
          </div>
        )}

        {canView && whatsappAvailable && statusQuery.isLoading && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4" role="status" aria-live="polite">
            <p className="text-sm text-primary-light">Cargando estado...</p>
          </div>
        )}

        {canView && whatsappAvailable && statusQuery.isError && (
          <div className="space-y-3">
            <FeedbackBanner
              tone="error"
              message={toWhatsappBusinessFriendlyMessage(statusQuery.error as unknown as AppError)}
            />
            <Button type="button" variant="outline" onClick={() => void statusQuery.refetch()}>
              <RefreshCw className="mr-2 size-4" />
              Reintentar
            </Button>
          </div>
        )}

        {canView && whatsappAvailable && !statusQuery.isLoading && !statusQuery.isError && (
          <>
            {activationState === "polling" && <FeedbackBanner tone="warning" message={stateCopy} />}
            {activationState === "timeout" && <FeedbackBanner tone="warning" message={stateCopy} />}
            {activationState === "failed" && <FeedbackBanner tone="error" message={stateCopy} />}

            {isInboundPending && (
              <div
                data-testid="inbound-webhook-pending-indicator"
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                role="status"
                aria-live="polite"
              >
                <RefreshCw
                  className="mt-0.5 size-5 shrink-0 animate-spin text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-900" aria-label="Configurando recepción de mensajes">
                    Configurando recepción de mensajes…
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Esto puede tardar unos segundos. No cierres esta página.
                  </p>
                </div>
              </div>
            )}

            {showInboundRetryBanner && !isInboundPending && canManage && (
              <div
                data-testid="inbound-webhook-error-banner"
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">No estamos recibiendo mensajes todavía</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Conectaste tu WhatsApp pero la configuración para recibir mensajes falló. Sin esto, el bot no va a
                      responder a tus clientes. Reintentá la configuración.
                    </p>
                    {inboundRetryDetail ? (
                      <>
                        <p className="mt-2 text-sm font-medium text-amber-900">Detalle: {inboundRetryDetail}</p>
                        <p className="mt-1 text-sm text-amber-800">Si el problema persiste, contactanos.</p>
                      </>
                    ) : null}
                  </div>
                </div>
                <Button
                  data-testid="retry-inbound-webhook-button"
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start border-amber-300 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-100"
                  onClick={handleRetryInbound}
                  disabled={retryInboundMutation.isPending}
                  aria-label={retryInboundMutation.isPending ? "Reintentando configuración de webhook" : "Reintentar configuración de webhook"}
                >
                  {retryInboundMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      Reintentando…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                      Reintentar configuración
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className={`rounded-xl border p-4 ${getStatusPanelClass(statusTone)}`} aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Estado</p>
                <StatusChip label={statusLabel} tone={toChipTone(statusTone)} />
              </div>

              <div className="mt-3 space-y-2 text-sm text-primary-light">
                {isInboundRegistered ? (
                  <p
                    data-testid="inbound-webhook-active-indicator"
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Mensajes activos
                  </p>
                ) : null}
                {status?.displayName ? (
                  <p>
                    <span className="font-medium text-primary">Nombre:</span> {status.displayName}
                  </p>
                ) : null}
                {status?.displayPhoneNumber ? (
                  <p>
                    <span className="font-medium text-primary">Número:</span> {status.displayPhoneNumber}
                  </p>
                ) : null}
                <p>{stateCopy}</p>
                {capabilityLabels.length > 0 ? (
                  <ul className="grid gap-1 pt-1 text-xs sm:grid-cols-2">
                    {capabilityLabels.map((label) => (
                      <li key={label} className="rounded-full bg-white/70 px-2 py-1 text-primary-light">
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {canManage ? (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                {!isConnected ? (
                  <Button
                    type="button"
                    className={connectButtonClass}
                    onClick={handleStartOnboarding}
                    disabled={isConnectButtonDisabled}
                    aria-label={connectButtonAriaLabel}
                  >
                    {isConnectButtonBusy ? (
                      <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                    )}
                    <span aria-live="polite">{connectButtonLabel}</span>
                  </Button>
                ) : null}

                {fallbackSetupLinkUrl && !isConnected ? (
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleFallbackRedirect}>
                    Continuar en esta pestaña
                  </Button>
                ) : null}

                {isConnected ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 sm:w-auto"
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Unlink className="mr-2 size-4" />
                    Desconectar
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-primary-light">Solo un administrador puede modificar esta integración.</p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Desconectar WhatsApp Business"
        message="¿Seguro? Dejarás de enviar y recibir mensajes por WhatsApp Business hasta volver a conectarlo."
        confirmLabel="Desconectar"
        pendingLabel="Desconectando..."
        isPending={disconnectMutation.isPending}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => disconnectMutation.mutate()}
      />
    </PageCard>
  );
}
