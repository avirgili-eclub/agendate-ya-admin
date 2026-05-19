import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { fetchBookingServicesCatalog } from "@/features/bookings/bookings-service";
import { fetchClients } from "@/features/clients/clients-service";
import { fetchMembershipOccupancy } from "@/features/memberships/memberships-service";
import type {
  CreateClientSubscriptionInput,
  MembershipOccupancy,
  MembershipPlan,
  MembershipRecurringSlot,
} from "@/features/memberships/membership-types";
import { useMembershipPlansQuery } from "@/features/memberships/use-memberships-query";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import { Button } from "@/shared/ui/button";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { DAY_NAMES, MEMBERSHIP_SCHEDULE_MODE_LABELS } from "./membership-detail-panel";
import { occupancySlotKey } from "./membership-occupancy-tab";

type MembershipCreatePanelProps = {
  initialClient?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  } | null;
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

type FieldErrors = Partial<
  Record<"clientId" | "clientPhone" | "planId" | "serviceId" | "startsAt" | "endsAt" | "recurringSlots", string>
>;
type SlotAvailability = {
  kind: "available" | "full" | "loading" | "unknown" | "missing";
  label: string;
};

type MembershipCreateClient = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
};

const STEP_LABELS: Record<WizardStep, string> = {
  "client-plan": "Cliente y plan",
  schedule: "Horarios",
  review: "Revision",
};

const ALL_STEPS: WizardStep[] = ["client-plan", "schedule", "review"];

function todayAsDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsDateInput(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDayOfTargetMonth));

  return target.toISOString().slice(0, 10);
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

function getSlotAvailabilityClass(kind: SlotAvailability["kind"]) {
  if (kind === "full") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (kind === "available") {
    return "border-success/30 bg-success/10 text-success-dark";
  }
  if (kind === "loading") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-neutral-dark bg-neutral text-primary-light";
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
  initialClient,
  serverError,
  isSubmitting,
  onCancel,
  onSubmit,
}: MembershipCreatePanelProps) {
  const [step, setStep] = useState<WizardStep>("client-plan");
  const [clientSearch, setClientSearch] = useState(initialClient?.fullName ?? "");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [clientId, setClientId] = useState(initialClient?.id ?? "");
  const [selectedClientSnapshot, setSelectedClientSnapshot] = useState<MembershipCreateClient | null>(() =>
    initialClient
      ? {
          id: initialClient.id,
          fullName: initialClient.fullName,
          phone: initialClient.phone ?? "",
          email: initialClient.email,
        }
      : null,
  );
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(todayAsDateInput);
  const [endsAt, setEndsAt] = useState(() => addMonthsDateInput(todayAsDateInput(), 1));
  const [serviceId, setServiceId] = useState("");
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
  const servicesQuery = useQuery({
    queryKey: ["bookings", "services", "membership-create"],
    queryFn: fetchBookingServicesCatalog,
    staleTime: 60_000,
  });
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
  const activeServices = useMemo(
    () => (servicesQuery.data ?? []).filter((service) => service.active),
    [servicesQuery.data],
  );
  const selectedPlan = activePlans.find((plan) => plan.id === planId);
  const clients = useMemo<MembershipCreateClient[]>(() => {
    const queryClients = (clientsQuery.data?.clients ?? []).map((client) => ({
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      email: client.email,
    }));
    if (!selectedClientSnapshot || queryClients.some((client) => client.id === selectedClientSnapshot.id)) {
      return queryClients;
    }

    return [selectedClientSnapshot, ...queryClients];
  }, [clientsQuery.data?.clients, selectedClientSnapshot]);
  const resources = (resourcesQuery.data?.data ?? []).filter(
    (resource) => resource.active && (!serviceId || resource.serviceIds.includes(serviceId)),
  );
  const hasActivePlans = activePlans.length > 0;
  const shouldUseSlots = needsFixedSlots(selectedPlan, assignFixedSlots);
  const selectedResourceIds = useMemo(
    () => [...new Set(slotDrafts.map((slot) => slot.resourceId).filter(Boolean))],
    [slotDrafts],
  );
  const occupancyQueries = useQueries({
    queries: selectedResourceIds.map((currentResourceId) => ({
      queryKey: ["membership-occupancy", { resourceId: currentResourceId, validOn: startsAt }],
      queryFn: () => fetchMembershipOccupancy({ resourceId: currentResourceId, validOn: startsAt }),
      enabled: shouldUseSlots && Boolean(startsAt),
      staleTime: 15_000,
    })),
  });
  const occupancyByResource = new Map<string, MembershipOccupancy>();
  const occupancyLoadingResources = new Set<string>();
  const occupancyErrorResources = new Set<string>();

  selectedResourceIds.forEach((currentResourceId, index) => {
    const query = occupancyQueries[index];
    if (query?.data) {
      occupancyByResource.set(currentResourceId, query.data);
    }
    if (query?.isLoading || query?.isFetching) {
      occupancyLoadingResources.add(currentResourceId);
    }
    if (query?.isError) {
      occupancyErrorResources.add(currentResourceId);
    }
  });

  useEffect(() => {
    if (initialClient?.id) {
      setSelectedClientSnapshot({
        id: initialClient.id,
        fullName: initialClient.fullName,
        phone: initialClient.phone ?? "",
        email: initialClient.email,
      });
      setClientId(initialClient.id);
      setClientSearch(initialClient.fullName);
    }
  }, [initialClient?.fullName, initialClient?.id]);

  useEffect(() => {
    if (selectedPlan?.scheduleMode === "FIXED") {
      setAssignFixedSlots(true);
    }
    if (selectedPlan?.scheduleMode === "FLEXIBLE") {
      setAssignFixedSlots(false);
    }
  }, [selectedPlan?.scheduleMode]);

  function handleStartDateChange(value: string) {
    setStartsAt(value);
    setEndsAt(addMonthsDateInput(value, 1));
  }

  const selectedClient = selectedClientSnapshot?.id === clientId
    ? selectedClientSnapshot
    : clients.find((client) => client.id === clientId);

  function handleClientChange(value: string) {
    const nextClient = clients.find((client) => client.id === value);
    setClientId(value);
    if (nextClient) {
      setSelectedClientSnapshot(nextClient);
    }
  }

  function validateClientPlanStep() {
    const nextErrors: FieldErrors = {};
    if (!clientId) {
      nextErrors.clientId = "Selecciona un cliente.";
    } else if (!selectedClient) {
      nextErrors.clientId = "Vuelve a seleccionar el cliente.";
    }
    if (!planId) {
      nextErrors.planId = "Selecciona un plan.";
    }
    if (!serviceId) {
      nextErrors.serviceId = "Selecciona un servicio.";
    }
    if (!startsAt) {
      nextErrors.startsAt = "Selecciona una fecha de inicio.";
    }
    if (!endsAt) {
      nextErrors.endsAt = "Selecciona una fecha de fin.";
    } else if (startsAt && endsAt <= startsAt) {
      nextErrors.endsAt = "La fecha de fin debe ser posterior al inicio.";
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
      } else if (validSlots.some((slot) => occupancyLoadingResources.has(slot.resourceId))) {
        nextErrors.recurringSlots = "Espera a que se verifiquen los cupos seleccionados.";
      } else if (validSlots.some((slot) => getSlotAvailability(slot).kind === "full")) {
        nextErrors.recurringSlots = "Hay un horario lleno. Elige otro recurso, dia u horario.";
      } else if (validSlots.some((slot) => getSlotAvailability(slot).kind === "unknown")) {
        nextErrors.recurringSlots = "No pudimos verificar cupo para un horario. Reintenta antes de continuar.";
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
    const firstSlotResourceId = recurringSlots?.[0]?.resourceId;
    const firstSlotResource = firstSlotResourceId
      ? resources.find((resource) => resource.id === firstSlotResourceId)
      : undefined;

    onSubmit({
      clientId,
      planId,
      serviceId,
      clientName: selectedClient?.fullName ?? "",
      clientPhone: selectedClient?.phone ?? "",
      clientEmail: selectedClient?.email,
      locationId: firstSlotResource?.locationId,
      startDate: startsAt,
      endDate: endsAt,
      recurringSlots,
    });
  }

  function getSlotAvailability(slot: SlotDraft): SlotAvailability {
    if (!slot.resourceId || !slot.startTime) {
      return { kind: "missing", label: "Completa recurso y hora" };
    }

    if (occupancyLoadingResources.has(slot.resourceId)) {
      return { kind: "loading", label: "Verificando cupo..." };
    }

    const resource = resources.find((item) => item.id === slot.resourceId);
    const occupancy = occupancyByResource.get(slot.resourceId);
    const capacity = occupancy?.capacity || resource?.capacity || 0;
    const occupiedSlot = occupancy?.occupancy.find(
      (item) => occupancySlotKey(item.dayOfWeek, item.startTime) === occupancySlotKey(Number(slot.dayOfWeek), slot.startTime),
    );

    if (occupiedSlot) {
      const inferredCapacity = capacity || occupiedSlot.activeSubscriptions + occupiedSlot.availableSlots;
      const label = inferredCapacity > 0
        ? `${occupiedSlot.activeSubscriptions}/${inferredCapacity} ocupados`
        : `${occupiedSlot.activeSubscriptions} ocupadas`;
      return {
        kind: occupiedSlot.availableSlots <= 0 ? "full" : "available",
        label: occupiedSlot.availableSlots <= 0 ? `${label} - lleno` : `${label} - ${occupiedSlot.availableSlots} libres`,
      };
    }

    if (occupancyErrorResources.has(slot.resourceId)) {
      return { kind: "unknown", label: "No se pudo verificar occupancy" };
    }

    if (capacity > 0) {
      return { kind: "available", label: `0/${capacity} ocupados - ${capacity} libres` };
    }

    return { kind: "unknown", label: "Sin dato de capacidad" };
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <StepIndicator currentStep={step} />

      {serverError ? <FeedbackBanner tone="error" message={serverError} /> : null}

      {step === "client-plan" ? (
        <section className="space-y-4">
          {!plansQuery.isLoading && !hasActivePlans ? (
            <FeedbackBanner
              tone="warning"
              message="Primero crea un plan activo para poder dar de alta membresias."
            />
          ) : null}

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
            <Select value={clientId} onValueChange={handleClientChange} disabled={clientsQuery.isLoading || clients.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={clientsQuery.isLoading ? "Cargando clientes..." : "Seleccionar cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.fullName} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.clientId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientId}</span> : null}
            {fieldErrors.clientPhone ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientPhone}</span> : null}
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
                    {plan.name} - {MEMBERSHIP_SCHEDULE_MODE_LABELS[plan.scheduleMode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.planId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.planId}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Servicio *</span>
            <Select value={serviceId} onValueChange={setServiceId} disabled={servicesQuery.isLoading || activeServices.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={servicesQuery.isLoading ? "Cargando servicios..." : "Seleccionar servicio"} />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.durationMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.serviceId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.serviceId}</span> : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha de inicio *</span>
              <input
                type="date"
                value={startsAt}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
              />
              {fieldErrors.startsAt ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.startsAt}</span> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha de fin *</span>
              <input
                type="date"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
              />
              {fieldErrors.endsAt ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.endsAt}</span> : null}
            </label>
          </div>
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
                  Verificamos cupos antes de confirmar horarios fijos.
                </p>
              </div>

              {slotDrafts.map((slot, index) => {
                const availability = getSlotAvailability(slot);
                return (
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

                    <div className={`rounded-md border px-3 py-2 text-xs font-semibold md:col-span-4 ${getSlotAvailabilityClass(availability.kind)}`}>
                      {availability.label}
                    </div>
                  </div>
                );
              })}

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
                <dt className="text-primary-light">Servicio</dt>
                <dd className="text-right font-medium text-primary">
                  {activeServices.find((service) => service.id === serviceId)?.name ?? "Servicio"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Inicio</dt>
                <dd className="text-right font-medium text-primary">{startsAt}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary-light">Fin</dt>
                <dd className="text-right font-medium text-primary">{endsAt}</dd>
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
          <Button type="button" onClick={handleNext} disabled={step === "client-plan" && !plansQuery.isLoading && !hasActivePlans}>
            Continuar
          </Button>
        )}
      </div>
    </form>
  );
}
