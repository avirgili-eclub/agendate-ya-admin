import { useState } from "react";
import { CalendarDays, CreditCard, Lock, Plus, RefreshCw, TicketCheck, Users } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { MembershipPlansTab } from "@/features/memberships/components/membership-plans-tab";
import { MembershipSubscriptionsTab } from "@/features/memberships/components/membership-subscriptions-tab";
import { getMembershipError } from "@/features/memberships/membership-errors";
import type { MembershipScheduleMode } from "@/features/memberships/membership-types";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
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

function TabPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <PageCard>
      <div className="flex flex-col gap-4 py-8 text-center sm:items-center">
        <span className="mx-auto rounded-lg bg-neutral p-3 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-primary-light">{description}</p>
        </div>
      </div>
    </PageCard>
  );
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
  const anyPlanConfigured = subscriptions?.anyPlanConfigured ?? false;
  const activeSubscriptionPlans = subscriptions?.activeSubscriptionPlans ?? 0;
  const recommendedMode = capabilities?.recommended?.subscriptionsMode ?? null;
  const shouldShowSubscriptionsUI = capabilities?.recommended?.showSubscriptionsUI ?? false;
  const hasAvailableModes = (subscriptions?.scheduleModesAvailable.length ?? 0) > 0;
  const moduleApplies = shouldShowSubscriptionsUI || recommendedMode !== null || anyPlanConfigured || hasAvailableModes;

  if (!moduleApplies) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Membresias no disponibles para este rubro"
        description="Este negocio puede seguir usando agenda, turnos y servicios sin configurar membresias."
      />
    );
  }

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
                Tu plan actual no incluye la gestion de membresias. Puedes revisar la suscripcion del tenant para habilitar planes y suscripciones de clientes.
              </p>
            </div>
          </div>
          <a
            href="/configuracion"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            Ver suscripcion
          </a>
        </div>
      </PageCard>
    );
  }

  return (
    <div className="space-y-5">
      {!anyPlanConfigured && activeTab !== "plans" && (
        <EmptyState
          icon={TicketCheck}
          title="Crea el primer plan de membresia"
          description="Define la cantidad de clases, el precio y si el cliente usa horarios fijos o reservas flexibles."
          action={
            <Button type="button" onClick={() => setActiveTab("plans")} className="gap-2">
              <Plus className="size-4" />
              Ir a planes
            </Button>
          }
        />
      )}

      <PageCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Estado</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {getSubscriptionsSummaryText(activeSubscriptionPlans)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Modo recomendado</p>
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

      <Tabs tabs={MEMBERSHIP_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "subscriptions" && (
        <MembershipSubscriptionsTab />
      )}

      {activeTab === "plans" && (
        <MembershipPlansTab defaultScheduleMode={recommendedMode} />
      )}

      {activeTab === "occupancy" && (
        <TabPlaceholder
          icon={RefreshCw}
          title="Cupos por sala y horario"
          description="Los cupos ocupados van a aparecer por sala, dia y horario para controlar clases fijas."
        />
      )}
    </div>
  );
}
