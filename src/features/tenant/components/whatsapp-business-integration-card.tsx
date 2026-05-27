import { useMemo, useState, type FormEvent } from "react";
import { MessageCircle, RefreshCw, Save, Unlink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  canManageWhatsappBusinessConnection,
  canViewWhatsappBusinessStatus,
  configureWhatsappBusinessNumber,
  disconnectWhatsappBusiness,
  fetchWhatsappBusinessStatus,
  getWhatsappBusinessCapabilityLabels,
  getWhatsappBusinessStatusLabel,
  getWhatsappBusinessStatusTone,
  toWhatsappBusinessFriendlyMessage,
  whatsappBusinessKeys,
  type WhatsappBusinessConfigInput,
  type WhatsappBusinessStatusTone,
} from "@/features/whatsapp-business/whatsapp-business-service";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useFeedback } from "@/shared/notifications/use-feedback";

function toChipTone(tone: WhatsappBusinessStatusTone) {
  if (tone === "muted") {
    return "neutral";
  }

  return tone;
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function WhatsappBusinessIntegrationCard() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const canView = canViewWhatsappBusinessStatus(session.user?.role);
  const canManage = canManageWhatsappBusinessConnection(session.user?.role);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");

  const statusQuery = useQuery({
    queryKey: whatsappBusinessKeys.status(),
    queryFn: fetchWhatsappBusinessStatus,
    enabled: canView,
  });

  const status = statusQuery.data;

  const isConnected = status?.connected || status?.status === "ACTIVE" || status?.status === "CONNECTED";
  const statusLabel = status ? getWhatsappBusinessStatusLabel(status.status) : "Sin conectar";
  const capabilityLabels = useMemo(() => (status ? getWhatsappBusinessCapabilityLabels(status) : []), [status]);

  const configureMutation = useMutation({
    mutationFn: configureWhatsappBusinessNumber,
    onSuccess: async () => {
      showFeedback("success", "Número de WhatsApp Business guardado correctamente.");
      await queryClient.invalidateQueries({ queryKey: whatsappBusinessKeys.status() });
    },
    onError: (error) => {
      showFeedback("error", toWhatsappBusinessFriendlyMessage(error as unknown as AppError));
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPhoneNumber = phoneNumber.trim();
    if (!trimmedPhoneNumber) {
      showFeedback("error", "Ingresá el número de WhatsApp Business.");
      return;
    }

    const payload: WhatsappBusinessConfigInput = {
      phoneNumber: trimmedPhoneNumber,
      displayPhoneNumber: normalizeOptional(displayPhoneNumber),
      displayName: normalizeOptional(displayName),
    };

    configureMutation.mutate(payload);
  }

  return (
    <PageCard className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
        <MessageCircle className="size-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-primary">WhatsApp Business</h2>
          <p className="text-xs text-primary-light">Conectá el número que usás para hablar con tus clientes.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

        {!canView && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
            <p className="text-sm text-primary-light">
              Esta integración solo es visible para administradores.
            </p>
          </div>
        )}

        {canView && statusQuery.isLoading && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-4" role="status" aria-live="polite">
            <p className="text-sm text-primary-light">Cargando estado...</p>
          </div>
        )}

        {canView && statusQuery.isError && (
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

        {canView && !statusQuery.isLoading && !statusQuery.isError && (
          <>
            <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Estado</p>
                <StatusChip label={statusLabel} tone={toChipTone(getWhatsappBusinessStatusTone(status?.status ?? "NOT_CONNECTED"))} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-primary-light">
                {status?.displayPhoneNumber ? (
                  <p>
                    <span className="font-medium text-primary">Número visible:</span> {status.displayPhoneNumber}
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
                    {statusLabel === "Pendiente"
                      ? "Estamos revisando la activación del número."
                      : statusLabel === "Requiere atención"
                        ? "Revisá los datos del número o intentá guardarlo nuevamente."
                        : statusLabel === "Activo"
                          ? "El número está listo para usarse."
                          : "Todavía no conectaste un número."}
                  </p>
                )}
              </div>
            </div>

            {canManage ? (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary" htmlFor="whatsapp-phone-number">
                    Número de WhatsApp Business
                  </label>
                  <input
                    id="whatsapp-phone-number"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="+595981123456"
                    disabled={configureMutation.isPending}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary" htmlFor="whatsapp-display-phone-number">
                    Número visible
                  </label>
                  <input
                    id="whatsapp-display-phone-number"
                    value={displayPhoneNumber}
                    onChange={(event) => setDisplayPhoneNumber(event.target.value)}
                    className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0981 123 456"
                    disabled={configureMutation.isPending}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary" htmlFor="whatsapp-display-name">
                    Nombre para mostrar
                  </label>
                  <input
                    id="whatsapp-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Mi negocio"
                    disabled={configureMutation.isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" disabled={configureMutation.isPending}>
                    <Save className="mr-2 size-4" />
                    {configureMutation.isPending
                      ? "Guardando..."
                      : isConnected
                        ? "Actualizar número"
                        : "Conectar número"}
                  </Button>

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
              </form>
            ) : (
              <p className="text-xs text-primary-light">Solo un administrador puede modificar esta integración.</p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Desconectar WhatsApp Business"
        message="AgendateYA dejará de usar este número, pero tu cuenta de WhatsApp Business no se elimina."
        confirmLabel="Desconectar"
        pendingLabel="Desconectando..."
        isPending={disconnectMutation.isPending}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => disconnectMutation.mutate()}
      />
    </PageCard>
  );
}

