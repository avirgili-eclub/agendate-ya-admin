import { CalendarDays, CreditCard, History, Plus, TicketCheck } from "lucide-react";
import { useMemo } from "react";

import type { ClientItem } from "@/features/clients/clients-service";
import {
  DAY_NAMES,
  MEMBERSHIP_BILLING_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  getMembershipScheduleModeLabel,
} from "@/features/memberships/components/membership-detail-panel";
import type {
  ClientSubscription,
  MembershipBillingStatus,
  MembershipStatus,
} from "@/features/memberships/membership-types";
import { useClientSubscriptionsQuery } from "@/features/memberships/use-memberships-query";
import { Button } from "@/shared/ui/button";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { StatusChip } from "@/shared/ui/status-chip";

type ClientMembershipSummaryProps = {
  client: ClientItem;
  isActive: boolean;
  onCreateMembership?: (client: ClientItem) => void;
};

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

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

function getUsageLabel(subscription: ClientSubscription) {
  if (subscription.classesPerPeriod == null) {
    return `${subscription.classesUsed} usadas / ilimitado`;
  }

  return `${subscription.classesUsed} de ${subscription.classesPerPeriod}`;
}

function getUsagePercent(subscription: ClientSubscription) {
  if (!subscription.classesPerPeriod || subscription.classesPerPeriod <= 0) {
    return null;
  }

  return Math.min(100, Math.round((subscription.classesUsed / subscription.classesPerPeriod) * 100));
}

function getSlotLabel(slot: ClientSubscription["recurringSlots"][number]) {
  const day = DAY_NAMES[slot.dayOfWeek] ?? "Dia";
  const resource = slot.resourceName ? ` - ${slot.resourceName}` : "";
  return `${day} ${slot.startTime}${resource}`;
}

function getSortTimestamp(subscription: ClientSubscription) {
  const value = subscription.createdAt ?? subscription.startsAt ?? subscription.currentPeriodStart;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortClientSubscriptions(subscriptions: ClientSubscription[]) {
  return [...subscriptions].sort((left, right) => {
    if (left.status === "ACTIVE" && right.status !== "ACTIVE") return -1;
    if (right.status === "ACTIVE" && left.status !== "ACTIVE") return 1;
    return getSortTimestamp(right) - getSortTimestamp(left);
  });
}

function MetricBox({ label, value, helper }: { label: string; value: React.ReactNode; helper?: string }) {
  return (
    <div className="rounded-lg border border-neutral-dark bg-white p-3">
      <p className="text-[11px] font-semibold uppercase text-primary-light">{label}</p>
      <div className="mt-1 text-sm font-semibold text-primary">{value}</div>
      {helper ? <p className="mt-1 text-[11px] text-primary-light">{helper}</p> : null}
    </div>
  );
}

export function ClientMembershipSummary({
  client,
  isActive,
  onCreateMembership,
}: ClientMembershipSummaryProps) {
  const subscriptionsQuery = useClientSubscriptionsQuery(
    { clientId: client.id },
    { enabled: isActive, staleTime: 15_000 },
  );

  const subscriptions = useMemo(
    () => sortClientSubscriptions(subscriptionsQuery.data ?? []),
    [subscriptionsQuery.data],
  );
  const activeSubscription = subscriptions.find((subscription) => subscription.status === "ACTIVE");
  const primarySubscription = activeSubscription ?? subscriptions[0];
  const historicalSubscriptions = primarySubscription
    ? subscriptions.filter((subscription) => subscription.id !== primarySubscription.id)
    : subscriptions;

  if (subscriptionsQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-primary-light">Cargando membresias...</div>;
  }

  if (subscriptionsQuery.isError) {
    return (
      <FeedbackBanner
        tone="error"
        message="No pudimos cargar las membresias de este cliente. Intenta nuevamente desde el modulo Membresias."
      />
    );
  }

  if (!primarySubscription) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-dark bg-neutral/50 p-6 text-center">
        <TicketCheck className="mx-auto size-10 text-primary-light" aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold text-primary">Sin membresia activa</h3>
        <p className="mt-2 text-sm text-primary-light">
          Este cliente todavia no tiene una suscripcion registrada en el tenant.
        </p>
        {onCreateMembership ? (
          <Button type="button" className="mt-5 gap-2" onClick={() => onCreateMembership(client)}>
            <Plus className="size-4" />
            Crear membresia
          </Button>
        ) : null}
      </div>
    );
  }

  const usagePercent = getUsagePercent(primarySubscription);
  const upcomingClasses = primarySubscription.upcomingClasses.slice(0, 3);
  const recurringSlots = primarySubscription.recurringSlots;
  const isActiveSubscription = primarySubscription.status === "ACTIVE";
  const scheduleModeLabel = getMembershipScheduleModeLabel(primarySubscription.scheduleMode);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-neutral-dark bg-neutral/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary-light">
              {isActiveSubscription ? "Membresia activa" : "Ultima membresia"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-primary">{primarySubscription.planName}</h3>
            <p className="mt-1 text-sm text-primary-light">
              Inicio {formatDate(primarySubscription.startsAt ?? primarySubscription.currentPeriodStart)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip
              tone={getStatusTone(primarySubscription.status)}
              label={MEMBERSHIP_STATUS_LABELS[primarySubscription.status]}
            />
            <StatusChip
              tone={getBillingTone(primarySubscription.billingStatus)}
              label={
                primarySubscription.billingStatus
                  ? MEMBERSHIP_BILLING_STATUS_LABELS[primarySubscription.billingStatus]
                  : "Sin pago"
              }
            />
          </div>
        </div>

        {onCreateMembership ? (
          <div className="mt-4 border-t border-neutral-dark pt-4">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => onCreateMembership(client)}>
              <Plus className="size-4" />
              Crear otra membresia
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <MetricBox
          label="Uso del periodo"
          value={getUsageLabel(primarySubscription)}
          helper={primarySubscription.classesPerPeriod == null ? "sin limite mensual" : `${usagePercent ?? 0}% usado`}
        />
        {scheduleModeLabel ? (
          <MetricBox
            label="Modalidad"
            value={scheduleModeLabel}
            helper={recurringSlots.length > 0 ? `${recurringSlots.length} horarios fijos` : "sin horarios fijos"}
          />
        ) : null}
        <MetricBox
          label="Periodo actual"
          value={formatDate(primarySubscription.currentPeriodEnd ?? primarySubscription.endsAt)}
          helper="fecha de corte"
        />
        <MetricBox
          label="Renovacion manual"
          value={primarySubscription.manualRenewalOverride ? "Activada" : "Desactivada"}
          helper="override administrativo"
        />
      </section>

      {usagePercent !== null ? (
        <section>
          <div className="h-2 rounded-full bg-neutral-dark">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <CalendarDays className="size-4" />
          Horarios y proximas clases
        </h3>
        <div className="space-y-3 rounded-lg border border-neutral-dark bg-white p-4">
          {recurringSlots.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {recurringSlots.map((slot) => (
                <div
                  key={`${slot.resourceId}-${slot.dayOfWeek}-${slot.startTime}`}
                  className="rounded-md bg-neutral px-3 py-2 text-sm text-primary"
                >
                  {getSlotLabel(slot)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary-light">Esta membresia no tiene horarios fijos.</p>
          )}

          {upcomingClasses.length > 0 ? (
            <div className="border-t border-neutral-dark pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-primary-light">Proximas</p>
              <div className="space-y-2">
                {upcomingClasses.map((item) => (
                  <div key={item.bookingId} className="rounded-md bg-neutral px-3 py-2">
                    <p className="text-sm font-medium text-primary">{formatDateTime(item.startTime)}</p>
                    <p className="mt-1 text-xs text-primary-light">
                      {[item.serviceName, item.resourceName, item.status].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {historicalSubscriptions.length > 0 ? (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <History className="size-4" />
            Historial de membresias
          </h3>
          <div className="space-y-2">
            {historicalSubscriptions.slice(0, 4).map((subscription) => (
              <div
                key={subscription.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-dark bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-primary">{subscription.planName}</p>
                  <p className="mt-1 text-xs text-primary-light">
                    {formatDate(subscription.startsAt ?? subscription.currentPeriodStart)} - {getUsageLabel(subscription)}
                  </p>
                </div>
                <StatusChip tone={getStatusTone(subscription.status)} label={MEMBERSHIP_STATUS_LABELS[subscription.status]} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-neutral-dark bg-white p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-4 text-primary-light" aria-hidden="true" />
          <p className="text-sm text-primary-light">
            Las acciones finas de pago, renovacion y baja se mantienen en el modulo Membresias para evitar duplicar flujos administrativos.
          </p>
        </div>
      </section>
    </div>
  );
}
