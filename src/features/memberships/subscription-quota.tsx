import { AlertTriangle } from "lucide-react";

import type { ClientSubscription } from "@/features/memberships/membership-types";
import { Button } from "@/shared/ui/button";
import { StatusChip } from "@/shared/ui/status-chip";

type SubscriptionQuotaSummaryProps = {
  subscription: ClientSubscription;
  onWarningClick?: (subscription: ClientSubscription) => void;
};

export function getOccupiedQuota(subscription: ClientSubscription) {
  return subscription.scheduled + subscription.consumed;
}

export function getQuotaUsagePercent(subscription: ClientSubscription) {
  if (subscription.isUnlimited || !subscription.totalIncluded || subscription.totalIncluded <= 0) {
    return null;
  }

  return Math.min(100, Math.round((getOccupiedQuota(subscription) / subscription.totalIncluded) * 100));
}

export function getQuotaUsageLabel(subscription: ClientSubscription) {
  if (subscription.isUnlimited) {
    return "Plan ilimitado";
  }

  return `${getOccupiedQuota(subscription)}/${subscription.totalIncluded ?? 0}`;
}

export function getQuotaHelperLabel(subscription: ClientSubscription) {
  const breakdown = `Reservadas ${subscription.scheduled} · Tomadas ${subscription.consumed}`;

  if (subscription.isUnlimited) {
    return breakdown;
  }

  return `${breakdown} · Disponibles ${subscription.available ?? 0}`;
}

export function getQuotaPlanLabel(subscription: ClientSubscription) {
  if (subscription.isUnlimited) {
    return "Ilimitado";
  }

  const total = subscription.totalIncluded ?? 0;
  return total === 1 ? "1 clase" : `${total} clases`;
}

export function SubscriptionQuotaSummary({
  subscription,
  onWarningClick,
}: SubscriptionQuotaSummaryProps) {
  const hasDrift = subscription.overAllocated > 0;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-primary">{getQuotaUsageLabel(subscription)}</span>
        {subscription.isUnlimited ? <StatusChip tone="neutral" label="Ilimitado" /> : null}
        {hasDrift ? (
          onWarningClick ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-red-300 px-2 text-xs text-red-700 hover:bg-red-50"
              onClick={() => onWarningClick(subscription)}
              title="Ver detalle de sobre-asignacion"
            >
              <AlertTriangle className="size-3.5" />
              +{subscription.overAllocated}
            </Button>
          ) : (
            <StatusChip tone="danger" label={`+${subscription.overAllocated}`} />
          )
        ) : null}
      </div>
      <p className="text-xs text-primary-light">{getQuotaHelperLabel(subscription)}</p>
    </div>
  );
}
