import { useMemo, useState } from "react";
import { Link2, MessageCircle, RefreshCw, Unlink } from "lucide-react";
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
  startWhatsappBusinessOnboarding,
  toWhatsappBusinessFriendlyMessage,
  whatsappBusinessKeys,
  type WhatsappBusinessStatusTone,
} from "@/features/whatsapp-business/whatsapp-business-service";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useFeedback } from "@/shared/notifications/use-feedback";

type WhatsappActivationState = "idle" | "polling" | "connected" | "timeout" | "failed";

type WhatsappBusinessIntegrationCardProps = {
  whatsappAvailable?: boolean;
  capabilitiesLoading?: boolean;
  activationState?: WhatsappActivationState;
};

function toChipTone(tone: WhatsappBusinessStatusTone) {
  if (tone === "muted") {
    return "neutral";
  }

  return tone;
}

export function WhatsappBusinessIntegrationCard({
  whatsappAvailable = true,
  capabilitiesLoading = false,
  activationState = "idle",
}: WhatsappBusinessIntegrationCardProps) {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const canView = canViewWhatsappBusinessStatus(session.user?.role);
  const canManage = canManageWhatsappBusinessConnection(session.user?.role);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const statusQuery = useQuery({
    queryKey: whatsappBusinessKeys.status(),
    queryFn: fetchWhatsappBusinessStatus,
    enabled: canView && whatsappAvailable,
  });

  const status = statusQuery.data;
  const isConnected = status?.connected || status?.status === "ACTIVE" || status?.status === "CONNECTED";
  const statusLabel = status ? getWhatsappBusinessStatusLabel(status.status) : "Sin conectar";
  const capabilityLabels = useMemo(() => (status ? getWhatsappBusinessCapabilityLabels(status) : []), [status]);

  const startOnboardingMutation = useMutation({
    mutationFn: startWhatsappBusinessOnboarding,
    onSuccess: ({ setupLinkUrl }) => {
      window.location.href = setupLinkUrl;
    },
    onError: async (error) => {
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

  const canStartOnboarding = canManage && whatsappAvailable && !isConnected;

  return (
    <PageCard className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
        <MessageCircle className="size-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-primary">WhatsApp Business</h2>
          <p className="text-xs text-primary-light">Conecta la cuenta que usas para hablar con tus clientes.</p>
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
            message="Tu plan actual no incluye WhatsApp Business. Actualiza tu suscripcion para activarlo."
          />
        )}

        {!canView && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
            <p className="text-sm text-primary-light">Esta integracion solo es visible para administradores.</p>
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
            {activationState === "polling" && (
              <FeedbackBanner
                tone="warning"
                message="Estamos confirmando la activacion. Esto puede tardar unos segundos."
              />
            )}
            {activationState === "timeout" && (
              <FeedbackBanner
                tone="warning"
                message="La conexion esta en proceso. Si no aparece activa en unos minutos, volve a revisar el estado."
              />
            )}
            {activationState === "failed" && (
              <FeedbackBanner tone="error" message="No se pudo completar la conexion. Podes intentarlo de nuevo." />
            )}

            <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Estado</p>
                <StatusChip label={statusLabel} tone={toChipTone(getWhatsappBusinessStatusTone(status?.status ?? "NOT_CONNECTED"))} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-primary-light">
                {status?.displayPhoneNumber ? (
                  <p>
                    <span className="font-medium text-primary">Numero visible:</span> {status.displayPhoneNumber}
                  </p>
                ) : null}
                {status?.displayName ? (
                  <p>
                    <span className="font-medium text-primary">Nombre para mostrar:</span> {status.displayName}
                  </p>
                ) : null}
                {capabilityLabels.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {capabilityLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {activationState === "polling"
                      ? "Estamos esperando la confirmacion final de WhatsApp Business."
                      : statusLabel === "Pendiente"
                        ? "Estamos revisando la activacion."
                        : statusLabel === "Requiere atención"
                          ? "La conexion necesita atencion. Intenta iniciar la conexion nuevamente."
                          : statusLabel === "Activo"
                            ? "La cuenta esta lista para usarse."
                            : "Todavia no conectaste WhatsApp Business."}
                  </p>
                )}
              </div>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {!isConnected ? (
                  <Button
                    type="button"
                    onClick={() => startOnboardingMutation.mutate()}
                    disabled={!canStartOnboarding || startOnboardingMutation.isPending || activationState === "polling"}
                  >
                    <Link2 className="mr-2 size-4" />
                    {startOnboardingMutation.isPending ? "Abriendo conexion..." : "Conectar WhatsApp"}
                  </Button>
                ) : null}

                {isConnected ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Unlink className="mr-2 size-4" />
                    Desconectar
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-primary-light">Solo un administrador puede modificar esta integracion.</p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Desconectar WhatsApp Business"
        message="AgendateYA dejara de usar esta conexion, pero tu cuenta de WhatsApp Business no se elimina."
        confirmLabel="Desconectar"
        pendingLabel="Desconectando..."
        isPending={disconnectMutation.isPending}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => disconnectMutation.mutate()}
      />
    </PageCard>
  );
}

