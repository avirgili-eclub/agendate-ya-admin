import { useMemo, useState } from "react";
import { Edit3, Plus, TicketCheck, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getMembershipError } from "@/features/memberships/membership-errors";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  updateMembershipPlan,
} from "@/features/memberships/memberships-service";
import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipScheduleMode,
} from "@/features/memberships/membership-types";
import { useMembershipPlansQuery } from "@/features/memberships/use-memberships-query";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";
import { SidePanel } from "@/shared/ui/side-panel";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";

import { MembershipPlanFormPanel } from "./membership-plan-form-panel";

type MembershipPlansTabProps = {
  defaultScheduleMode?: MembershipScheduleMode | null;
  onPlanCreated?: () => void;
};

const SCHEDULE_MODE_LABELS: Record<MembershipScheduleMode, string> = {
  FIXED: "Fija",
  FLEXIBLE: "Flexible",
  BOTH: "Mixta",
};

function formatPrice(plan: MembershipPlan) {
  const amount = Number(plan.price);
  if (!Number.isFinite(amount)) {
    return `${plan.price} ${plan.currency}`;
  }

  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: plan.currency || "PYG",
    maximumFractionDigits: plan.currency === "PYG" ? 0 : 2,
  }).format(amount);
}

function getModeTone(mode: MembershipScheduleMode) {
  if (mode === "FIXED") return "success";
  if (mode === "BOTH") return "warning";
  return "neutral";
}

function getClassesLabel(classesPerPeriod: number | null) {
  if (classesPerPeriod == null) {
    return "Ilimitadas";
  }

  if (classesPerPeriod === 1) {
    return "1 clase/mes";
  }

  return `${classesPerPeriod} clases/mes`;
}

function normalizeAppError(error: unknown): AppError {
  if (typeof error === "object" && error !== null && "status" in error && "code" in error) {
    return error as AppError;
  }

  return {
    code: "UNKNOWN_ERROR",
    status: 0,
    message: error instanceof Error ? error.message : "Unexpected error",
  };
}

function PlanActions({
  plan,
  onEdit,
  onDelete,
}: {
  plan: MembershipPlan;
  onEdit: (plan: MembershipPlan) => void;
  onDelete: (plan: MembershipPlan) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(plan)}
        className="rounded-md p-1.5 text-primary-light transition-colors hover:bg-neutral-dark hover:text-primary"
        aria-label={`Editar ${plan.name}`}
        title="Editar"
      >
        <Edit3 className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(plan)}
        className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
        aria-label={`Eliminar ${plan.name}`}
        title="Eliminar"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function PlanMobileCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: MembershipPlan;
  onEdit: (plan: MembershipPlan) => void;
  onDelete: (plan: MembershipPlan) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-dark bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{plan.name}</p>
          <p className="mt-1 text-xs text-primary-light">{plan.description || "Sin descripcion"}</p>
        </div>
        <StatusChip tone={plan.active ? "success" : "neutral"} label={plan.active ? "Activo" : "Inactivo"} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Modalidad</p>
          <StatusChip tone={getModeTone(plan.scheduleMode)} label={SCHEDULE_MODE_LABELS[plan.scheduleMode]} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Clases</p>
          <p className="font-medium text-primary">{getClassesLabel(plan.classesPerPeriod)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-primary-light">Precio</p>
          <p className="font-medium text-primary">{formatPrice(plan)}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-neutral-dark pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(plan)}>
          <Edit3 className="mr-2 size-4" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => onDelete(plan)}
        >
          <Trash2 className="mr-2 size-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function MembershipPlansTab({ defaultScheduleMode, onPlanCreated }: MembershipPlansTabProps) {
  const plansQuery = useMembershipPlansQuery();
  const queryClient = useQueryClient();
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planPendingDelete, setPlanPendingDelete] = useState<MembershipPlan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activePlans = useMemo(
    () => (plansQuery.data ?? []).filter((plan) => plan.active).length,
    [plansQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createMembershipPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
      showFeedback("success", "Plan creado correctamente.");
      setIsFormOpen(false);
      setFormError(null);
      onPlanCreated?.();
    },
    onError: (error: AppError) => {
      setFormError(getMembershipError(error).message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MembershipPlanInput }) =>
      updateMembershipPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
      showFeedback("success", "Plan actualizado correctamente.");
      setIsFormOpen(false);
      setEditingPlan(null);
      setFormError(null);
    },
    onError: (error: AppError) => {
      setFormError(getMembershipError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMembershipPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
      showFeedback("success", "Plan eliminado correctamente.");
      setPlanPendingDelete(null);
    },
    onError: (error: AppError) => {
      showFeedback("error", getMembershipError(error).message);
      setPlanPendingDelete(null);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function openCreateForm() {
    setEditingPlan(null);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(plan: MembershipPlan) {
    setEditingPlan(plan);
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSubmitting) {
      return;
    }
    setIsFormOpen(false);
    setEditingPlan(null);
    setFormError(null);
  }

  function handleSubmit(input: MembershipPlanInput) {
    setFormError(null);
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, input });
      return;
    }

    createMutation.mutate(input);
  }

  const columns: DataTableColumn<MembershipPlan>[] = [
    {
      id: "plan",
      header: "Plan",
      cell: (plan) => (
        <div>
          <p className="font-medium text-primary">{plan.name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-primary-light">{plan.description || "Sin descripcion"}</p>
        </div>
      ),
    },
    {
      id: "mode",
      header: "Modalidad",
      cell: (plan) => (
        <StatusChip tone={getModeTone(plan.scheduleMode)} label={SCHEDULE_MODE_LABELS[plan.scheduleMode]} />
      ),
    },
    {
      id: "classes",
      header: "Clases",
      cell: (plan) => getClassesLabel(plan.classesPerPeriod),
    },
    {
      id: "price",
      header: "Precio",
      cell: (plan) => <span className="font-medium text-primary">{formatPrice(plan)}</span>,
    },
    {
      id: "status",
      header: "Estado",
      cell: (plan) => <StatusChip tone={plan.active ? "success" : "neutral"} label={plan.active ? "Activo" : "Inactivo"} />,
    },
    {
      id: "actions",
      header: "Acciones",
      cell: (plan) => <PlanActions plan={plan} onEdit={openEditForm} onDelete={setPlanPendingDelete} />,
      className: "w-[120px]",
      headerClassName: "w-[120px]",
    },
  ];

  if (plansQuery.isLoading) {
    return <LoadingState message="Cargando planes de membresia..." />;
  }

  if (plansQuery.isError) {
    return (
      <ErrorState
        title="Error al cargar planes"
        message={getMembershipError(normalizeAppError(plansQuery.error)).message}
        onRetry={() => void plansQuery.refetch()}
      />
    );
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-4">
      {feedback ? <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} /> : null}

      <PageCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Planes</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              {activePlans === 1 ? "1 plan activo" : `${activePlans} planes activos`}
            </h2>
          </div>
          <Button type="button" onClick={openCreateForm} className="w-full gap-2 sm:w-auto">
            <Plus className="size-4" />
            Nuevo plan
          </Button>
        </div>

        <DataTable
          data={plans}
          columns={columns}
          rowKey={(plan) => plan.id}
          mobileRow={(plan) => <PlanMobileCard plan={plan} onEdit={openEditForm} onDelete={setPlanPendingDelete} />}
          emptyState={
            <EmptyState
              icon={TicketCheck}
              title="Sin planes de membresia"
              description="Crea el primer plan para vender suscripciones a clientes."
              action={
                <Button type="button" onClick={openCreateForm} className="gap-2">
                  <Plus className="size-4" />
                  Nuevo plan
                </Button>
              }
            />
          }
        />
      </PageCard>

      <SidePanel
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingPlan ? "Editar plan" : "Nuevo plan"}
      >
        <MembershipPlanFormPanel
          key={editingPlan?.id ?? "new-plan"}
          plan={editingPlan}
          defaultScheduleMode={defaultScheduleMode}
          serverError={formError}
          isSubmitting={isSubmitting}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </SidePanel>

      <ConfirmDialog
        isOpen={Boolean(planPendingDelete)}
        title="Eliminar plan"
        message={
          planPendingDelete
            ? `Quieres eliminar "${planPendingDelete.name}"? Si tiene suscripciones activas, backend va a rechazar la operacion.`
            : undefined
        }
        confirmLabel="Eliminar"
        pendingLabel="Eliminando..."
        cancelLabel="Volver"
        isPending={deleteMutation.isPending}
        tone="danger"
        onClose={() => setPlanPendingDelete(null)}
        onConfirm={() => {
          if (planPendingDelete) {
            deleteMutation.mutate(planPendingDelete.id);
          }
        }}
      />
    </div>
  );
}
