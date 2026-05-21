import { useMemo, useState } from "react";
import { CalendarDays, CreditCard, RotateCcw, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getMembershipError } from "@/features/memberships/membership-errors";
import {
  cancelClientSubscription,
  updateClientSubscriptionBillingStatus,
  updateClientSubscriptionManualRenewalOverride,
} from "@/features/memberships/memberships-service";
import type {
  ClientSubscriptionScheduleMode,
  ClientSubscription,
  MembershipBillingStatus,
  MembershipRecurringSlot,
  MembershipScheduleMode,
  MembershipStatus,
} from "@/features/memberships/membership-types";
import { BookingKindBadge } from "@/features/bookings/components/booking-kind-badge";
import { useClientSubscriptionDetailQuery } from "@/features/memberships/use-memberships-query";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatusChip } from "@/shared/ui/status-chip";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

export const MEMBERSHIP_BILLING_STATUS_LABELS: Record<MembershipBillingStatus, string> = {
  PAID: "Pagada",
  PENDING_PAYMENT: "Pendiente",
  OVERDUE: "Vencida",
  REFUNDED: "Reembolsada",
};

export const MEMBERSHIP_SCHEDULE_MODE_LABELS: Record<MembershipScheduleMode, string> = {
  FIXED: "Fija",
  FLEXIBLE: "Flexible",
  BOTH: "Mixta",
};

export function getMembershipScheduleModeLabel(mode?: ClientSubscriptionScheduleMode | null) {
  return mode ? MEMBERSHIP_SCHEDULE_MODE_LABELS[mode] : "";
}

export const DAY_NAMES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

type MembershipDetailPanelProps = {
  subscriptionId: string;
  subscriptionSummary?: ClientSubscription;
  onClose: () => void;
  onRefresh: () => void;
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusTone(status: MembershipStatus) {
  if (status === "ACTIVE") return "success";
  if (status === "PAUSED") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

function getBillingTone(status?: MembershipBillingStatus) {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "PENDING_PAYMENT") return "warning";
  return "neutral";
}

function getSlotLabel(slot: MembershipRecurringSlot) {
  const day = DAY_NAMES[slot.dayOfWeek] ?? "Dia";
  const resource = slot.resourceName ? ` - ${slot.resourceName}` : "";
  return `${day} ${slot.startTime}${resource}`;
}

function getUsageLabel(subscription: ClientSubscription) {
  if (subscription.classesPerPeriod == null) {
    return `${subscription.classesUsed} usadas - ilimitado`;
  }

  return `${subscription.classesUsed} de ${subscription.classesPerPeriod}`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-dark/70 py-2 last:border-b-0">
      <span className="text-sm text-primary-light">{label}</span>
      <span className="text-right text-sm font-medium text-primary">{value}</span>
    </div>
  );
}

export function MembershipDetailPanel({
  subscriptionId,
  subscriptionSummary,
  onClose,
  onRefresh,
}: MembershipDetailPanelProps) {
  const queryClient = useQueryClient();
  const { showFeedback } = useFeedback("system");
  const detailQuery = useClientSubscriptionDetailQuery(subscriptionId);
  const [billingStatus, setBillingStatus] = useState<MembershipBillingStatus>(
    subscriptionSummary?.billingStatus ?? "PENDING_PAYMENT",
  );
  const [pendingCancel, setPendingCancel] = useState(false);

  const subscription = detailQuery.data ?? subscriptionSummary;
  const detailError = detailQuery.error as unknown as AppError | undefined;

  const billingMutation = useMutation({
    mutationFn: (nextStatus: MembershipBillingStatus) =>
      updateClientSubscriptionBillingStatus(subscriptionId, nextStatus),
    onSuccess: (updated) => {
      setBillingStatus(updated.billingStatus ?? "PENDING_PAYMENT");
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["client-subscription", subscriptionId] });
      showFeedback("success", "Estado de pago actualizado.");
      onRefresh();
    },
    onError: (error: AppError) => {
      showFeedback("error", getMembershipError(error).message);
    },
  });

  const overrideMutation = useMutation({
    mutationFn: (nextValue: boolean) =>
      updateClientSubscriptionManualRenewalOverride(subscriptionId, nextValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["client-subscription", subscriptionId] });
      showFeedback("success", "Override de renovacion actualizado.");
      onRefresh();
    },
    onError: (error: AppError) => {
      showFeedback("error", getMembershipError(error).message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelClientSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["membership-occupancy"] });
      showFeedback("success", "Membresia dada de baja.");
      setPendingCancel(false);
      onRefresh();
      onClose();
    },
    onError: (error: AppError) => {
      showFeedback("error", getMembershipError(error).message);
      setPendingCancel(false);
    },
  });

  const upcomingClasses = useMemo(() => subscription?.upcomingClasses ?? [], [subscription?.upcomingClasses]);

  if (detailQuery.isLoading && !subscriptionSummary) {
    return <div className="py-8 text-center text-sm text-primary-light">Cargando detalle de membresia...</div>;
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <FeedbackBanner
          tone="error"
          message={detailError ? getMembershipError(detailError).message : "No pudimos cargar la membresia."}
        />
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    );
  }

  const currentBillingStatus = detailQuery.data?.billingStatus ?? subscription.billingStatus ?? "PENDING_PAYMENT";
  const manualRenewalOverride = Boolean(detailQuery.data?.manualRenewalOverride ?? subscription.manualRenewalOverride);
  const canCancel = subscription.status !== "CANCELLED" && subscription.status !== "EXPIRED";
  const scheduleModeLabel = getMembershipScheduleModeLabel(subscription.scheduleMode);

  return (
    <div className="space-y-6">
      {detailQuery.isError && subscriptionSummary ? (
        <FeedbackBanner
          tone="warning"
          message="No se pudieron cargar todos los detalles. Mostrando datos disponibles del listado."
        />
      ) : null}

      <section className="rounded-lg border border-neutral-dark bg-neutral/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">{subscription.clientName}</h3>
            <p className="mt-1 text-sm text-primary-light">{subscription.clientPhone || "Sin telefono"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={getStatusTone(subscription.status)} label={MEMBERSHIP_STATUS_LABELS[subscription.status]} />
            <StatusChip
              tone={getBillingTone(currentBillingStatus)}
              label={MEMBERSHIP_BILLING_STATUS_LABELS[currentBillingStatus]}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-primary">Resumen</h3>
        <div className="rounded-lg border border-neutral-dark bg-white p-4">
          <DetailRow label="Plan" value={subscription.planName} />
          {scheduleModeLabel ? <DetailRow label="Modalidad" value={scheduleModeLabel} /> : null}
          <DetailRow label="Uso del periodo" value={getUsageLabel(subscription)} />
          <DetailRow label="Inicio" value={formatDate(subscription.startsAt ?? subscription.currentPeriodStart)} />
          <DetailRow label="Fin de periodo" value={formatDate(subscription.currentPeriodEnd ?? subscription.endsAt)} />
          <DetailRow label="Renovacion manual" value={manualRenewalOverride ? "Activada" : "Desactivada"} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-primary">Pago</h3>
        <div className="rounded-lg border border-neutral-dark bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-primary-dark">Estado de pago</span>
              <Select value={billingStatus} onValueChange={(value) => setBillingStatus(value as MembershipBillingStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Pagada</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">Pendiente</SelectItem>
                  <SelectItem value="OVERDUE">Vencida</SelectItem>
                  <SelectItem value="REFUNDED">Reembolsada</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <Button
              type="button"
              onClick={() => billingMutation.mutate(billingStatus)}
              disabled={billingMutation.isPending || billingStatus === currentBillingStatus}
            >
              {billingMutation.isPending ? "Guardando..." : "Actualizar pago"}
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-primary">Horarios recurrentes</h3>
        <div className="rounded-lg border border-neutral-dark bg-white p-4">
          {subscription.recurringSlots.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {subscription.recurringSlots.map((slot) => (
                <div
                  key={`${slot.resourceId}-${slot.dayOfWeek}-${slot.startTime}`}
                  className="flex items-center gap-2 rounded-md bg-neutral px-3 py-2 text-sm text-primary"
                >
                  <CalendarDays className="size-4 text-primary-light" />
                  {getSlotLabel(slot)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary-light">Esta membresia no tiene horarios fijos.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-primary">Proximas clases</h3>
        <div className="rounded-lg border border-neutral-dark bg-white p-4">
          {upcomingClasses.length > 0 ? (
            <div className="space-y-2">
              {upcomingClasses.map((item) => (
                <div key={item.bookingId} className="rounded-md bg-neutral px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary">{formatDateTime(item.startTime)}</p>
                    <BookingKindBadge kind={item.bookingKind} />
                  </div>
                  <p className="mt-1 text-xs text-primary-light">
                    {[item.serviceName, item.resourceName, item.status].filter(Boolean).join(" - ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary-light">No hay proximas clases materializadas.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-dark bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary">Override de renovacion manual</h3>
            <p className="mt-1 text-sm text-primary-light">
              Usalo para controlar manualmente una renovacion fuera del flujo automatico.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => overrideMutation.mutate(!manualRenewalOverride)}
            disabled={overrideMutation.isPending}
          >
            <RotateCcw className="size-4" />
            {manualRenewalOverride ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </section>

      {canCancel ? (
        <section className="border-t border-neutral-dark pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setPendingCancel(true)}
          >
            <Trash2 className="size-4" />
            Dar de baja membresia
          </Button>
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={pendingCancel}
        title="Dar de baja membresia"
        message="Esta accion cancela la membresia del cliente. Los cupos fijos asociados vuelven a estar disponibles segun backend."
        confirmLabel="Dar de baja"
        pendingLabel="Cancelando..."
        cancelLabel="Volver"
        isPending={cancelMutation.isPending}
        tone="danger"
        onClose={() => setPendingCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
