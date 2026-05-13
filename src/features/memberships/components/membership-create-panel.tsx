import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { fetchClients } from "@/features/clients/clients-service";
import type { CreateClientSubscriptionInput, MembershipPlan, MembershipRecurringSlot } from "@/features/memberships/membership-types";
import { useMembershipPlansQuery } from "@/features/memberships/use-memberships-query";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import { Button } from "@/shared/ui/button";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { DAY_NAMES, MEMBERSHIP_SCHEDULE_MODE_LABELS } from "./membership-detail-panel";

type MembershipCreatePanelProps = {
  serverError?: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateClientSubscriptionInput) => void;
};

type WizardStep = "client-plan" | "schedule" | "review";

type SlotDraft = {
  resourceId: string;
  dayOfWeek: string;
  startTime: string;
};

type FieldErrors = Partial<Record<"clientId" | "planId" | "startsAt" | "recurringSlots", string>>;

const STEP_LABELS: Record<WizardStep, string> = {
  "client-plan": "Cliente y plan",
  schedule: "Horarios",
  review: "Revision",
};

const ALL_STEPS: WizardStep[] = ["client-plan", "schedule", "review"];

function todayAsDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function toStartOfDayIso(date: string) {
  return `${date}T00:00:00Z`;
}

function normalizeSlot(slot: SlotDraft): MembershipRecurringSlot {
  return {
    resourceId: slot.resourceId,
    dayOfWeek: Number(slot.dayOfWeek) as MembershipRecurringSlot["dayOfWeek"],
    startTime: slot.startTime,
  };
}

function needsFixedSlots(plan: MembershipPlan | undefined, assignFixedSlots: boolean) {
  if (!plan) return false;
  if (plan.scheduleMode === "FIXED") return true;
  if (plan.scheduleMode === "BOTH") return assignFixedSlots;
  return false;
}

function canSkipSlots(plan: MembershipPlan | undefined) {
  return !plan || plan.scheduleMode === "FLEXIBLE" || plan.scheduleMode === "BOTH";
}

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = ALL_STEPS.indexOf(currentStep);

  return (
    <ol className="grid grid-cols-3 gap-2">
      {ALL_STEPS.map((step, index) => {
        const isActive = step === currentStep;
        const isDone = index < currentIndex;
        return (
          <li
            key={step}
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              isActive
                ? "border-primary bg-primary text-white"
                : isDone
                  ? "border-success/40 bg-success/10 text-success-dark"
                  : "border-neutral-dark bg-white text-primary-light"
            }`}
          >
            {index + 1}. {STEP_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}

export function MembershipCreatePanel({
  serverError,
  isSubmitting,
  onCancel,
  onSubmit,
}: MembershipCreatePanelProps) {
  const [step, setStep] = useState<WizardStep>("client-plan");
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(todayAsDateInput);
  const [assignFixedSlots, setAssignFixedSlots] = useState(false);
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([
    { resourceId: "", dayOfWeek: "0", startTime: "" },
  ]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [clientSearch]);

  const plansQuery = useMembershipPlansQuery();
  const resourcesQuery = useResourcesQuery({ search: "", location: "", page: 0, pageSize: 200 });
  const isShortClientSearch = debouncedClientSearch.length > 0 && debouncedClientSearch.length < 3;
  const clientsQuery = useQuery({
    queryKey: ["clients", "membership-create", debouncedClientSearch],
    queryFn: () =>
      fetchClients({
        page: 0,
        size: 25,
        ...(debouncedClientSearch.length >= 3 ? { search: debouncedClientSearch } : {}),
      }),
    enabled: !isShortClientSearch,
    staleTime: 30_000,
  });

  const activePlans = useMemo(() => (plansQuery.data ?? []).filter((plan) => plan.active), [plansQuery.data]);
  const selectedPlan = activePlans.find((plan) => plan.id === planId);
  const clients = clientsQuery.data?.clients ?? [];
  const resources = (resourcesQuery.data?.data ?? []).filter((resource) => resource.active);
  const shouldUseSlots = needsFixedSlots(selectedPlan, assignFixedSlots);

  useEffect(() => {
    if (selectedPlan?.scheduleMode === "FIXED") {
      setAssignFixedSlots(true);
    }
    if (selectedPlan?.scheduleMode === "FLEXIBLE") {
      setAssignFixedSlots(false);
    }
  }, [selectedPlan?.scheduleMode]);

  function validateClientPlanStep() {
    const nextErrors: FieldErrors = {};
    if (!clientId) {
      nextErrors.clientId = "Selecciona un cliente.";
    }
    if (!planId) {
      nextErrors.planId = "Selecciona un plan.";
    }
    if (!startsAt) {
      nextErrors.startsAt = "Selecciona una fecha de inicio.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateScheduleStep() {
    const nextErrors: FieldErrors = {};
    if (shouldUseSlots) {
      const validSlots = slotDrafts.filter((slot) => slot.resourceId && slot.startTime);
      if (validSlots.length === 0) {
        nextErrors.recurringSlots = "Selecciona al menos un recurso, dia y horario.";
      }
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (step === "client-plan") {
      if (validateClientPlanStep()) {
        setStep("schedule");
      }
      return;
    }

    if (step === "schedule") {
      if (validateScheduleStep()) {
        setStep("review");
      }
    }
  }

  function handleBack() {
    if (step === "review") {
      setStep("schedule");
      return;
    }
    if (step === "schedule") {
      setStep("client-plan");
    }
  }

  function updateSlot(index: number, patch: Partial<SlotDraft>) {
    setSlotDrafts((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)),
    );
  }

  function addSlot() {
    setSlotDrafts((current) => [...current, { resourceId: "", dayOfWeek: "0", startTime: "" }]);
  }

  function removeSlot(index: number) {
    setSlotDrafts((current) => {
      const next = current.filter((_, slotIndex) => slotIndex !== index);
      return next.length > 0 ? next : [{ resourceId: "", dayOfWeek: "0", startTime: "" }];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateClientPlanStep() || !validateScheduleStep()) {
      return;
    }

    const recurringSlots = shouldUseSlots
      ? slotDrafts
          .filter((slot) => slot.resourceId && slot.startTime)
          .map(normalizeSlot)
      : undefined;

    onSubmit({
      clientId,
      planId,
      startsAt: toStartOfDayIso(startsAt),
      recurringSlots,
    });
  }

  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <StepIndicator currentStep={step} />

      {serverError ? <FeedbackBanner tone="error" message={serverError} /> : null}

      {step === "client-plan" ? (
        <section className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Buscar cliente</span>
            <input
              type="text"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
              placeholder="Nombre, telefono o email"
            />
            {isShortClientSearch ? (
              <span className="mt-1 block text-xs text-primary-light">Escribe al menos 3 caracteres para buscar.</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Cliente *</span>
            <Select value={clientId} onValueChange={setClientId} disabled={clientsQuery.isLoading || clients.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={clientsQuery.isLoading ? "Cargando clientes..." : "Seleccionar cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.fullName} · {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.clientId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientId}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Plan *</span>
            <Select value={planId} onValueChange={setPlanId} disabled={plansQuery.isLoading || activePlans.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={plansQuery.isLoading ? "Cargando planes..." : "Seleccionar plan"} />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} · {MEMBERSHIP_SCHEDULE_MODE_LABELS[plan.scheduleMode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.planId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.planId}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha de inicio *</span>
            <input
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
            {fieldErrors.startsAt ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.startsAt}</span> : null}
          </label>
        </section>
      ) : null}

      {step === "schedule" ? (
        <section className="space-y-4">
          {selectedPlan ? (
            <div className="rounded-lg border border-neutral-dark bg-neutral/50 p-4">
              <p className="text-sm font-semibold text-primary">{selectedPlan.name}</p>
              <p className="mt-1 text-sm text-primary-light">
                Modalidad: {MEMBERSHIP_SCHEDULE_MODE_LABELS[selectedPlan.scheduleMode]}
              </p>
            </div>
          ) : null}

          {selectedPlan?.scheduleMode === "BOTH" ? (
            <label className="flex items-start gap-3 rounded-lg border border-neutral-dark bg-white p-3">
              <input
                type="checkbox"
                checked={assignFixedSlots}
                onChange={(event) => setAssignFixedSlots(event.target.checked)}
                className="mt-1 size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
              />
              <span>
                <span className="block text-sm font-medium text-primary-dark">Asignar horarios fijos</span>
                <span className="mt-1 block text-xs text-primary-light">Si lo desactivas, la membresia se crea como flexible.</span>
              </span>
            </label>
          ) : null}

          {shouldUseSlots ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-primary">Horarios recurrentes</h3>
                <p className="mt-1 text-sm text-primary-light">
                  El control de cupos con occupancy se integra en el siguiente batch.
                </p>
              </div>

              {slotDrafts.map((slot, index) => (
                <div key={`slot-${index}`} className="grid gap-3 rounded-lg border border-neutral-dark bg-white p-3 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">Recurso</span>
                    <Select value={slot.resourceId} onValueChange={(value) => updateSlot(index, { resourceId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={resourcesQuery.isLoading ? "Cargando..." : "Seleccionar"} />
                      </SelectTrigger>
                      <SelectContent>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">Dia</span>
                    <Select value={slot.dayOfWeek} onValueChange={(value) => updateSlot(index, { dayOfWeek: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((day, dayIndex) => (
                          <SelectItem key={day} value={String(dayIndex)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">Hora</span>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(event) => updateSlot(index, { startTime: event.target.value })}
                      className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                    />
                  </label>

                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => removeSlot(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              {fieldErrors.recurringSlots ? (
                <span className="block text-xs text-red-700">{fieldErrors.recurringSlots}</span>
              ) : null}

              <Button type="button" variant="outline" onClick={addSlot} className="gap-2">
                <Plus className="size-4" />
                Agregar horario
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-dark bg-neutral/50 p-4">
              <p className="text-sm font-semibold text-primary">Membresia flexible</p>
              <p className="mt-1 text-sm text-primary-light">
                No se enviaran horarios recurrentes. El cliente usara sus clases reservando segun disponibilidad.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {step === "review" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-neutral-dark bg-white p-4">
            <h3 className="text-sm font-semibold text-primary">Resumen</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Cliente</dt>
                <dd className="text-right font-medium text-primary">{selectedClient?.fullName ?? "Cliente"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Plan</dt>
                <dd className="text-right font-medium text-primary">{selectedPlan?.name ?? "Plan"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Inicio</dt>
                <dd className="text-right font-medium text-primary">{startsAt}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Horarios</dt>
                <dd className="text-right font-medium text-primary">
                  {shouldUseSlots
                    ? `${slotDrafts.filter((slot) => slot.resourceId && slot.startTime).length} fijos`
                    : "Flexible"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <div className="flex justify-between gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={step === "client-plan" ? onCancel : handleBack} disabled={isSubmitting}>
          {step === "client-plan" ? "Cancelar" : "Volver"}
        </Button>
        {step === "review" ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear membresia"}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Continuar
          </Button>
        )}
      </div>
    </form>
  );
}
