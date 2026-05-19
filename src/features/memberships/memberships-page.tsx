import { useState } from "react";
import { CalendarDays, CreditCard, Lock, TicketCheck, Users } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { MembershipOccupancyTab } from "@/features/memberships/components/membership-occupancy-tab";
import { MembershipPlansTab } from "@/features/memberships/components/membership-plans-tab";
import { MembershipSubscriptionsTab } from "@/features/memberships/components/membership-subscriptions-tab";
import { getMembershipError } from "@/features/memberships/membership-errors";
import type { MembershipScheduleMode } from "@/features/memberships/membership-types";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { Tabs } from "@/shared/ui/tabs";

type MembershipTab = "subscriptions" | "plans" | "occupancy";

const MEMBERSHIP_TABS = [
  { id: "subscriptions" as const, label: "Suscripciones", icon: <Users className="size-4" /> },
  { id: "plans" as const, label: "Planes", icon: <TicketCheck className="size-4" /> },
  { id: "occupancy" as const, label: "Cupos", icon: <CalendarDays className="size-4" /> },
];

const SCHEDULE_MODE_LABELS: Record<MembershipScheduleMode, string> = {
  FIXED: "Fijo",
  FLEXIBLE: "Flexible",
  BOTH: "Mixto",
};

function formatRecommendedMode(mode: MembershipScheduleMode | null | undefined) {
  return mode ? SCHEDULE_MODE_LABELS[mode] : "No aplica";
}

function getModeTone(mode: MembershipScheduleMode | null | undefined) {
  if (mode === "FIXED") return "success";
  if (mode === "BOTH") return "warning";
  return "neutral";
}

function getSubscriptionsSummaryText(activePlans: number) {
  if (activePlans === 0) return "Sin planes activos";
  if (activePlans === 1) return "1 plan activo";
  return `${activePlans} planes activos`;
}

function normalizePageError(error: unknown): AppError {
  if (typeof error === "object" && error !== null && "status" in error && "code" in error) {
    return error as AppError;
  }

  return {
    code: "UNKNOWN_ERROR",
    status: 0,
    message: error instanceof Error ? error.message : "Unexpected error",
  };
}

export function MembershipsPage() {
  const [activeTab, setActiveTab] = useState<MembershipTab>("subscriptions");
  const capabilitiesQuery = useTenantCapabilitiesQuery();

  if (capabilitiesQuery.isLoading) {
    return <LoadingState message="Cargando membresias..." />;
  }

  if (capabilitiesQuery.isError) {
    const friendlyError = getMembershipError(normalizePageError(capabilitiesQuery.error));
    return (
      <ErrorState
        title={friendlyError.title}
        message={friendlyError.message}
        onRetry={() => void capabilitiesQuery.refetch()}
      />
    );
  }

  const capabilities = capabilitiesQuery.data;
  const subscriptions = capabilities?.modes.subscriptions;
  const tierAllows = subscriptions?.tierAllows ?? false;
  const enabledByTenant = subscriptions?.enabledByTenant ?? false;
  const subscriptionsEnabled = subscriptions?.enabled ?? (tierAllows && enabledByTenant);
  const anyPlanConfigured = subscriptions?.anyPlanConfigured ?? false;
  const activeSubscriptionPlans = subscriptions?.activeSubscriptionPlans ?? 0;
  const recommendedMode = capabilities?.recommended?.subscriptionsMode ?? null;
  const effectiveActiveTab = !anyPlanConfigured && activeTab !== "plans" ? "plans" : activeTab;

  if (!tierAllows) {
    return (
      <PageCard>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-secondary/15 p-3 text-secondary-dark">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-primary">Membresias bloqueadas por plan</h2>
              <p className="mt-1 max-w-3xl text-sm text-primary-light">
                Tu plan actual no incluye la gestion de membresias. Actualiza a PRO o ENTERPRISE para habilitar este modulo.
              </p>
            </div>
          </div>
          <a
            href="/configuracion?tab=subscription"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            Ver suscripcion
          </a>
        </div>
      </PageCard>
    );
  }

  if (!subscriptionsEnabled) {
    return (
      <PageCard>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-secondary/15 p-3 text-secondary-dark">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-primary">Membresias desactivadas</h2>
              <p className="mt-1 max-w-3xl text-sm text-primary-light">
                Tu plan permite membresias, pero el modulo todavia no esta activado para este negocio.
              </p>
            </div>
          </div>
          <a
            href="/configuracion?tab=subscription"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            Activar en configuracion
          </a>
        </div>
      </PageCard>
    );
  }

  return (
    <div className="space-y-5">
      <PageCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Estado</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {getSubscriptionsSummaryText(activeSubscriptionPlans)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Modo sugerido por rubro</p>
            <div className="mt-2">
              <StatusChip
                tone={getModeTone(recommendedMode)}
                label={formatRecommendedMode(recommendedMode)}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Tier</p>
            <p className="mt-1 text-lg font-semibold text-primary">{capabilities?.tier ?? "Sin datos"}</p>
          </div>
        </div>
      </PageCard>

      <Tabs tabs={MEMBERSHIP_TABS} activeTab={effectiveActiveTab} onTabChange={setActiveTab} />

      {effectiveActiveTab === "subscriptions" && (
        <MembershipSubscriptionsTab />
      )}

      {effectiveActiveTab === "plans" && (
        <MembershipPlansTab defaultScheduleMode={recommendedMode} />
      )}

      {effectiveActiveTab === "occupancy" && (
        <MembershipOccupancyTab />
      )}
    </div>
  );
}
