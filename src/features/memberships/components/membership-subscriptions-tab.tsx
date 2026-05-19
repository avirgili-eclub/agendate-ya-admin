import { useMemo, useState } from "react";
import { Eye, Plus, Search, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getMembershipError } from "@/features/memberships/membership-errors";
import { createClientSubscription } from "@/features/memberships/memberships-service";
import type {
  ClientSubscriptionScheduleMode,
  ClientSubscription,
  CreateClientSubscriptionInput,
  MembershipBillingStatus,
  MembershipStatus,
} from "@/features/memberships/membership-types";
import {
  useClientSubscriptionsQuery,
  useMembershipPlansQuery,
} from "@/features/memberships/use-memberships-query";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SidePanel } from "@/shared/ui/side-panel";
import { StatusChip } from "@/shared/ui/status-chip";

import { MembershipCreatePanel } from "./membership-create-panel";
import {
  DAY_NAMES,
  MEMBERSHIP_BILLING_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  getMembershipScheduleModeLabel,
  MembershipDetailPanel,
} from "./membership-detail-panel";

type StatusFilter = MembershipStatus | "ALL";
type PlanFilter = string | "ALL";

const STATUS_OPTIONS: StatusFilter[] = ["ALL", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"];

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

function getModeTone(mode: ClientSubscriptionScheduleMode) {
  if (mode === "FIXED") return "success";
  return "neutral";
}

function ScheduleModeCell({ mode }: { mode: ClientSubscriptionScheduleMode }) {
  const label = getMembershipScheduleModeLabel(mode);
  if (!label) {
    return <span className="text-sm text-primary-light">-</span>;
  }

  return <StatusChip tone={getModeTone(mode)} label={label} />;
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

function getUsageLabel(subscription: ClientSubscription) {
  if (subscription.classesPerPeriod == null) {
    return `${subscription.classesUsed} usadas`;
  }

  return `${subscription.classesUsed}/${subscription.classesPerPeriod}`;
}

function getNextClassLabel(subscription: ClientSubscription) {
  const upcoming = subscription.upcomingClasses[0];
  if (upcoming?.startTime) {
    return formatDateTime(upcoming.startTime);
  }

  const slot = subscription.recurringSlots[0];
  if (slot) {
    return `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}`;
  }

  return "-";
}

function subscriptionMatchesClientSearch(subscription: ClientSubscription, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return [subscription.clientName, subscription.clientPhone, subscription.planName]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function SubscriptionActions({
  subscription,
  onOpen,
}: {
  subscription: ClientSubscription;
  onOpen: (subscription: ClientSubscription) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(subscription)}
      className="rounded-md p-1.5 text-primary-light transition-colors hover:bg-neutral-dark hover:text-primary"
      aria-label={`Ver membresia de ${subscription.clientName}`}
      title="Ver detalle"
    >
      <Eye className="size-4" />
    </button>
  );
}

function SubscriptionMobileCard({
  subscription,
  onOpen,
}: {
  subscription: ClientSubscription;
  onOpen: (subscription: ClientSubscription) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-dark bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{subscription.clientName}</p>
          <p className="mt-1 text-xs text-primary-light">{subscription.planName}</p>
        </div>
        <StatusChip tone={getStatusTone(subscription.status)} label={MEMBERSHIP_STATUS_LABELS[subscription.status]} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Modalidad</p>
          <ScheduleModeCell mode={subscription.scheduleMode} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Uso</p>
          <p className="font-medium text-primary">{getUsageLabel(subscription)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Pago</p>
          <StatusChip
            tone={getBillingTone(subscription.billingStatus)}
            label={subscription.billingStatus ? MEMBERSHIP_BILLING_STATUS_LABELS[subscription.billingStatus] : "Sin dato"}
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Proxima</p>
          <p className="font-medium text-primary">{getNextClassLabel(subscription)}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-neutral-dark pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpen(subscription)}>
          <Eye className="mr-2 size-4" />
          Ver detalle
        </Button>
      </div>
    </div>
  );
}

export function MembershipSubscriptionsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<ClientSubscription | null>(null);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const subscriptionsQuery = useClientSubscriptionsQuery({
    status: statusFilter,
    planId: planFilter === "ALL" ? undefined : planFilter,
  });
  const plansQuery = useMembershipPlansQuery();
  const activePlans = useMemo(() => (plansQuery.data ?? []).filter((plan) => plan.active), [plansQuery.data]);
  const canCreateMembership = activePlans.length > 0;

  const createMutation = useMutation({
    mutationFn: (input: CreateClientSubscriptionInput) => createClientSubscription(input),
    onSuccess: (createdSubscription) => {
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["membership-occupancy"] });
      setCreateError(null);
      setIsCreatePanelOpen(false);
      setSelectedSubscription(createdSubscription);
    },
    onError: (error: AppError) => {
      setCreateError(getMembershipError(error).message);
    },
  });

  const subscriptions = subscriptionsQuery.data ?? [];
  const visibleSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscriptionMatchesClientSearch(subscription, clientSearch)),
    [clientSearch, subscriptions],
  );

  const hasActiveFilters = statusFilter !== "ALL" || planFilter !== "ALL" || clientSearch.trim().length > 0;

  const columns: DataTableColumn<ClientSubscription>[] = [
    {
      id: "client",
      header: "Cliente",
      cell: (subscription) => (
        <div>
          <p className="font-medium text-primary">{subscription.clientName}</p>
          <p className="mt-1 text-xs text-primary-light">{subscription.clientPhone || "Sin telefono"}</p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: (subscription) => subscription.planName,
    },
    {
      id: "mode",
      header: "Modalidad",
      cell: (subscription) => <ScheduleModeCell mode={subscription.scheduleMode} />,
    },
    {
      id: "usage",
      header: "Uso",
      cell: (subscription) => <span className="font-medium text-primary">{getUsageLabel(subscription)}</span>,
    },
    {
      id: "next-class",
      header: "Proxima clase",
      cell: (subscription) => getNextClassLabel(subscription),
    },
    {
      id: "billing",
      header: "Pago",
      cell: (subscription) => (
        <StatusChip
          tone={getBillingTone(subscription.billingStatus)}
          label={subscription.billingStatus ? MEMBERSHIP_BILLING_STATUS_LABELS[subscription.billingStatus] : "Sin dato"}
        />
      ),
    },
    {
      id: "status",
      header: "Estado",
      cell: (subscription) => (
        <StatusChip tone={getStatusTone(subscription.status)} label={MEMBERSHIP_STATUS_LABELS[subscription.status]} />
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: (subscription) => <SubscriptionActions subscription={subscription} onOpen={setSelectedSubscription} />,
      className: "w-[96px]",
      headerClassName: "w-[96px]",
    },
  ];

  if (subscriptionsQuery.isLoading) {
    return <LoadingState message="Cargando suscripciones..." />;
  }

  if (subscriptionsQuery.isError) {
    return (
      <ErrorState
        title="Error al cargar suscripciones"
        message={getMembershipError(subscriptionsQuery.error as unknown as AppError).message}
        onRetry={() => void subscriptionsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageCard>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
            <input
              type="text"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Buscar cliente, telefono o plan..."
              className="h-11 w-full rounded-md border border-neutral-dark bg-white pl-10 pr-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:ml-auto xl:w-auto">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "ALL" ? "Todos los estados" : MEMBERSHIP_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as PlanFilter)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los planes</SelectItem>
                {(plansQuery.data ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              onClick={() => {
                if (canCreateMembership) {
                  setIsCreatePanelOpen(true);
                }
              }}
              className="w-full gap-2 sm:w-auto"
              disabled={plansQuery.isLoading || !canCreateMembership}
              title={!canCreateMembership ? "Crea un plan activo antes de dar de alta membresias." : undefined}
            >
              <Plus className="size-4" />
              Nueva membresia
            </Button>
          </div>
        </div>

        <DataTable
          data={visibleSubscriptions}
          columns={columns}
          rowKey={(subscription) => subscription.id}
          mobileRow={(subscription) => (
            <SubscriptionMobileCard subscription={subscription} onOpen={setSelectedSubscription} />
          )}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? "Sin resultados" : "Sin suscripciones"}
              description={
                hasActiveFilters
                  ? "No encontramos suscripciones que coincidan con los filtros aplicados."
                  : "Cuando existan clientes suscriptos, van a aparecer en esta tabla."
              }
            />
          }
        />
      </PageCard>

      <SidePanel
        isOpen={Boolean(selectedSubscription)}
        onClose={() => setSelectedSubscription(null)}
        title="Detalle de membresia"
      >
        {selectedSubscription ? (
          <MembershipDetailPanel
            subscriptionId={selectedSubscription.id}
            subscriptionSummary={selectedSubscription}
            onClose={() => setSelectedSubscription(null)}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
            }}
          />
        ) : null}
      </SidePanel>

      <SidePanel
        isOpen={isCreatePanelOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreatePanelOpen(false);
            setCreateError(null);
          }
        }}
        title="Nueva membresia"
      >
        <MembershipCreatePanel
          serverError={createError}
          isSubmitting={createMutation.isPending}
          onCancel={() => {
            setIsCreatePanelOpen(false);
            setCreateError(null);
          }}
          onSubmit={(input) => createMutation.mutate(input)}
        />
      </SidePanel>
    </div>
  );
}
