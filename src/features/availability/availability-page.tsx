import { useMemo, useState, type FormEvent } from "react";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { fetchLocationResources } from "@/features/agenda/agenda-service";
import {
  DAY_NAMES,
  createAvailabilityOverride,
  createAvailabilityRule,
  deleteAvailabilityOverride,
  deleteAvailabilityRule,
  fetchAvailabilityOverrides,
  fetchAvailabilityRules,
  toAvailabilityFriendlyMessage,
  type CreateOverrideInput,
  type CreateRuleInput,
} from "@/features/availability/availability-service";
import { fetchResourceLocations } from "@/features/resources/resources-service";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";

type Feedback = { tone: "success" | "error"; message: string } | null;

type WeeklyTemplateInput = {
  startTime: string;
  endTime: string;
  activeDays: number[];
};

function toCheckedDays(daySet: Set<number>): number[] {
  return [...daySet].sort((a, b) => a - b);
}

function gatherRuleInputs(resourceIds: string[], template: WeeklyTemplateInput): CreateRuleInput[] {
  return resourceIds.flatMap((resourceId) =>
    template.activeDays.map((dayOfWeek) => ({
      resourceId,
      dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
    })),
  );
}

export function AvailabilityPage() {
  const queryClient = useQueryClient();

  const [selectedLocationName, setSelectedLocationName] = useState("Todas las ubicaciones");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [globalStartTime, setGlobalStartTime] = useState("08:00");
  const [globalEndTime, setGlobalEndTime] = useState("19:00");
  const [globalDays, setGlobalDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));

  const [localLocationId, setLocalLocationId] = useState("");
  const [localStartTime, setLocalStartTime] = useState("08:00");
  const [localEndTime, setLocalEndTime] = useState("19:00");
  const [localDays, setLocalDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));

  const [specialLocationId, setSpecialLocationId] = useState("");
  const [specialDate, setSpecialDate] = useState("");
  const [specialAvailable, setSpecialAvailable] = useState(true);
  const [specialStartTime, setSpecialStartTime] = useState("08:00");
  const [specialEndTime, setSpecialEndTime] = useState("13:00");

  const locationsQuery = useQuery({
    queryKey: ["availability", "locations"],
    queryFn: fetchResourceLocations,
    staleTime: 60_000,
  });

  const resourcesQuery = useResourcesQuery({
    search: "",
    location: selectedLocationName,
    page: 0,
    pageSize: 100,
  });

  const rulesQuery = useQuery({
    queryKey: ["availability", "rules", selectedResourceId],
    queryFn: () => fetchAvailabilityRules(selectedResourceId),
    enabled: !!selectedResourceId,
    staleTime: 30_000,
  });

  const overridesQuery = useQuery({
    queryKey: ["availability", "overrides", selectedResourceId],
    queryFn: () => fetchAvailabilityOverrides(selectedResourceId),
    enabled: !!selectedResourceId,
    staleTime: 30_000,
  });

  const locations = useMemo(
    () => ["Todas las ubicaciones", ...(locationsQuery.data ?? []).map((loc) => loc.name)],
    [locationsQuery.data],
  );

  const availableResources = useMemo(() => resourcesQuery.data?.data ?? [], [resourcesQuery.data]);

  const createRuleMutation = useMutation({
    mutationFn: createAvailabilityRule,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Regla creada correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "rules", selectedResourceId] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteAvailabilityRule,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Regla eliminada." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "rules", selectedResourceId] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const createOverrideMutation = useMutation({
    mutationFn: createAvailabilityOverride,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Excepción creada correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "overrides", selectedResourceId] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: deleteAvailabilityOverride,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Excepción eliminada." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "overrides", selectedResourceId] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const applyGlobalTemplateMutation = useMutation({
    mutationFn: async () => {
      const activeLocations = (locationsQuery.data ?? []).filter((loc) => loc.active);
      const locationResourceLists = await Promise.all(
        activeLocations.map((location) => fetchLocationResources(location.id)),
      );

      const uniqueResourceIds = Array.from(
        new Set(locationResourceLists.flat().filter((resource) => resource.active).map((resource) => resource.id)),
      );

      const template: WeeklyTemplateInput = {
        startTime: globalStartTime,
        endTime: globalEndTime,
        activeDays: toCheckedDays(globalDays),
      };

      const ruleInputs = gatherRuleInputs(uniqueResourceIds, template);
      await Promise.all(ruleInputs.map((input) => createAvailabilityRule(input)));
      return uniqueResourceIds.length;
    },
    onSuccess: (count) => {
      setFeedback({
        tone: "success",
        message: `Configuración global aplicada a ${count} recurso(s). La configuración por localidad puede sobrescribirla.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const applyLocationTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!localLocationId) {
        throw new Error("Selecciona una localidad para aplicar la configuración.");
      }
      const resources = (await fetchLocationResources(localLocationId)).filter((resource) => resource.active);
      const template: WeeklyTemplateInput = {
        startTime: localStartTime,
        endTime: localEndTime,
        activeDays: toCheckedDays(localDays),
      };
      const ruleInputs = gatherRuleInputs(resources.map((item) => item.id), template);
      await Promise.all(ruleInputs.map((input) => createAvailabilityRule(input)));
      return resources.length;
    },
    onSuccess: (count) => {
      setFeedback({
        tone: "success",
        message: `Configuración por localidad aplicada a ${count} recurso(s). Esta configuración pisa la global.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const applySpecialDayMutation = useMutation({
    mutationFn: async () => {
      if (!specialLocationId) {
        throw new Error("Selecciona una localidad para aplicar el día especial.");
      }
      if (!specialDate) {
        throw new Error("Selecciona una fecha especial.");
      }

      const resources = (await fetchLocationResources(specialLocationId)).filter((resource) => resource.active);
      const payloads: CreateOverrideInput[] = resources.map((resource) => ({
        resourceId: resource.id,
        date: specialDate,
        available: specialAvailable,
        startTime: specialAvailable ? specialStartTime : undefined,
        endTime: specialAvailable ? specialEndTime : undefined,
      }));
      await Promise.all(payloads.map((payload) => createAvailabilityOverride(payload)));
      return resources.length;
    },
    onSuccess: (count) => {
      setFeedback({
        tone: "success",
        message: `Día especial aplicado a ${count} recurso(s) de la localidad seleccionada.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  function toggleDay(day: number, target: "global" | "local") {
    const setter = target === "global" ? setGlobalDays : setLocalDays;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageCard>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-primary">Disponibilidad</h1>
          <p className="mt-1 text-sm text-primary-light">
            Configura disponibilidad global y por localidad. La configuración por localidad pisa la global.
          </p>
        </div>

        {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

        {locationsQuery.isLoading && <LoadingState message="Cargando localidades..." />}
        {locationsQuery.isError && (
          <ErrorState
            title="No se pudieron cargar localidades"
            message="Reintenta para continuar con la configuración de disponibilidad."
            onRetry={() => void locationsQuery.refetch()}
          />
        )}

        {!locationsQuery.isLoading && !locationsQuery.isError && (locationsQuery.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={Calendar}
            title="Sin localidades"
            description="No hay localidades disponibles para configurar horarios."
          />
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PageCard className="bg-white">
            <h2 className="text-lg font-semibold text-primary">Configuración global</h2>
            <p className="mt-1 text-xs text-primary-light">
              Define el horario base para todo el negocio y aplicalo a todos los recursos activos.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-primary-light">
                Inicio
                <input
                  type="time"
                  value={globalStartTime}
                  onChange={(e) => setGlobalStartTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs text-primary-light">
                Fin
                <input
                  type="time"
                  value={globalEndTime}
                  onChange={(e) => setGlobalEndTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_NAMES.map((dayName, index) => (
                <button
                  key={dayName}
                  type="button"
                  onClick={() => toggleDay(index, "global")}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    globalDays.has(index)
                      ? "border-primary bg-primary text-white"
                      : "border-neutral-dark bg-white text-primary-light"
                  }`}
                >
                  {dayName.slice(0, 3)}
                </button>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => applyGlobalTemplateMutation.mutate()}
              disabled={applyGlobalTemplateMutation.isPending}
            >
              {applyGlobalTemplateMutation.isPending ? "Aplicando..." : "Aplicar global a todas las localidades"}
            </Button>
          </PageCard>

          <PageCard className="bg-white">
            <h2 className="text-lg font-semibold text-primary">Configuración por localidad</h2>
            <p className="mt-1 text-xs text-primary-light">
              Este bloque sobrescribe la configuración global para la localidad seleccionada.
            </p>
            <label className="mt-4 block text-xs text-primary-light">
              Localidad
              <select
                value={localLocationId}
                onChange={(e) => setLocalLocationId(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
              >
                <option value="">Selecciona una localidad</option>
                {(locationsQuery.data ?? []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-primary-light">
                Inicio
                <input
                  type="time"
                  value={localStartTime}
                  onChange={(e) => setLocalStartTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs text-primary-light">
                Fin
                <input
                  type="time"
                  value={localEndTime}
                  onChange={(e) => setLocalEndTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_NAMES.map((dayName, index) => (
                <button
                  key={dayName}
                  type="button"
                  onClick={() => toggleDay(index, "local")}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    localDays.has(index)
                      ? "border-primary bg-primary text-white"
                      : "border-neutral-dark bg-white text-primary-light"
                  }`}
                >
                  {dayName.slice(0, 3)}
                </button>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => applyLocationTemplateMutation.mutate()}
              disabled={applyLocationTemplateMutation.isPending || !localLocationId}
            >
              {applyLocationTemplateMutation.isPending ? "Aplicando..." : "Aplicar configuración a esta localidad"}
            </Button>
          </PageCard>
        </div>

        <PageCard className="mt-4 bg-white">
          <h2 className="text-lg font-semibold text-primary">Días especiales por localidad</h2>
          <p className="mt-1 text-xs text-primary-light">
            Define excepciones de horario para una localidad completa (ej: sábados 08:00 a 13:00).
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              value={specialLocationId}
              onChange={(e) => setSpecialLocationId(e.target.value)}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            >
              <option value="">Selecciona localidad</option>
              {(locationsQuery.data ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={specialDate}
              onChange={(e) => setSpecialDate(e.target.value)}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            />
            <select
              value={specialAvailable ? "true" : "false"}
              onChange={(e) => setSpecialAvailable(e.target.value === "true")}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            >
              <option value="true">Disponible</option>
              <option value="false">No disponible</option>
            </select>
            <input
              type="time"
              value={specialStartTime}
              onChange={(e) => setSpecialStartTime(e.target.value)}
              disabled={!specialAvailable}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary disabled:bg-neutral"
            />
            <input
              type="time"
              value={specialEndTime}
              onChange={(e) => setSpecialEndTime(e.target.value)}
              disabled={!specialAvailable}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary disabled:bg-neutral"
            />
          </div>
          <Button
            className="mt-4 w-full md:w-auto"
            onClick={() => applySpecialDayMutation.mutate()}
            disabled={applySpecialDayMutation.isPending || !specialLocationId || !specialDate}
          >
            {applySpecialDayMutation.isPending ? "Aplicando..." : "Aplicar día especial a localidad"}
          </Button>
        </PageCard>

        <div className="my-6 border-t border-neutral-dark" />

        <div className="mb-4 rounded-lg border border-neutral-dark bg-neutral p-4">
          <h2 className="mb-3 text-sm font-semibold text-primary">Editor por recurso</h2>
          <p className="mb-3 text-xs text-primary-light">
            Ajuste fino por recurso individual. Si elegís una localidad, se filtran los recursos de esa localidad.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedLocationName}
              onChange={(e) => {
                setSelectedLocationName(e.target.value);
                setSelectedResourceId("");
              }}
              className="flex-1 rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              disabled={availableResources.length === 0}
              className="flex-1 rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary disabled:bg-neutral"
            >
              <option value="">Selecciona un recurso</option>
              {availableResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.locationName})
                </option>
              ))}
            </select>
          </div>
          {availableResources.length === 0 && selectedLocationName !== "Todas las ubicaciones" && (
            <p className="mt-2 text-xs text-primary-light">No hay recursos activos en esta localidad.</p>
          )}
        </div>

        {!selectedResourceId && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-8 text-center">
            <Clock className="mx-auto mb-3 size-12 text-primary-light" />
            <p className="text-sm text-primary-light">Selecciona un recurso para configurar disponibilidad puntual.</p>
          </div>
        )}

        {selectedResourceId && (
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-dark bg-white p-5">
              <h2 className="text-lg font-semibold text-primary">Horarios semanales (recurso)</h2>
              <p className="mt-1 text-xs text-primary-light">
                Día 0 = Lunes, Día 6 = Domingo. Puedes agregar múltiples reglas por recurso.
              </p>

              {rulesQuery.isLoading && <div className="py-8 text-center text-sm text-primary-light">Cargando reglas...</div>}
              {rulesQuery.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Error al cargar reglas.</div>
              )}

              {rulesQuery.isSuccess && (
                <>
                  {rulesQuery.data.length === 0 && (
                    <div className="py-8 text-center text-sm text-primary-light">No hay reglas semanales definidas.</div>
                  )}
                  {rulesQuery.data.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {rulesQuery.data.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between rounded-md border border-neutral-dark bg-neutral p-3">
                          <p className="text-sm font-medium text-primary">
                            {DAY_NAMES[rule.dayOfWeek]} - {rule.startTime} a {rule.endTime}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm("Eliminar esta regla?")) {
                                deleteRuleMutation.mutate(rule.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <WeeklyRuleForm
                    resourceId={selectedResourceId}
                    onSubmit={async (input) => {
                      await createRuleMutation.mutateAsync(input);
                    }}
                  />
                </>
              )}
            </div>

            <div className="rounded-lg border border-neutral-dark bg-white p-5">
              <h2 className="text-lg font-semibold text-primary">Excepciones puntuales (recurso)</h2>

              {overridesQuery.isLoading && (
                <div className="py-8 text-center text-sm text-primary-light">Cargando excepciones...</div>
              )}
              {overridesQuery.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Error al cargar excepciones.</div>
              )}

              {overridesQuery.isSuccess && (
                <>
                  {overridesQuery.data.length === 0 && (
                    <div className="py-8 text-center text-sm text-primary-light">No hay excepciones definidas.</div>
                  )}
                  {overridesQuery.data.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {overridesQuery.data.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-md border border-neutral-dark bg-neutral p-3">
                          <div>
                            <p className="text-sm font-medium text-primary">{item.date}</p>
                            <StatusChip
                              tone={item.available ? "success" : "danger"}
                              label={item.available ? "Disponible" : "No disponible"}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm("Eliminar esta excepción?")) {
                                deleteOverrideMutation.mutate(item.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <OverrideForm
                    resourceId={selectedResourceId}
                    onSubmit={async (input) => {
                      await createOverrideMutation.mutateAsync(input);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </PageCard>
    </div>
  );
}

type WeeklyRuleFormProps = {
  resourceId: string;
  onSubmit: (input: CreateRuleInput) => Promise<void>;
};

function WeeklyRuleForm({ resourceId, onSubmit }: WeeklyRuleFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ resourceId, dayOfWeek, startTime, endTime });
      setDayOfWeek(0);
      setStartTime("09:00");
      setEndTime("18:00");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-primary/20 bg-primary/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">Agregar regla semanal</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
        >
          {DAY_NAMES.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
        />
        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "..." : <Plus className="size-4" />}
        </Button>
      </div>
    </form>
  );
}

type OverrideFormProps = {
  resourceId: string;
  onSubmit: (input: CreateOverrideInput) => Promise<void>;
};

function OverrideForm({ resourceId, onSubmit }: OverrideFormProps) {
  const [date, setDate] = useState("");
  const [available, setAvailable] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        resourceId,
        date,
        available,
        startTime: available ? startTime : undefined,
        endTime: available ? endTime : undefined,
      });
      setDate("");
      setAvailable(true);
      setStartTime("09:00");
      setEndTime("13:00");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-primary/20 bg-primary/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">Agregar excepción</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            required
          />
          <select
            value={available ? "true" : "false"}
            onChange={(e) => setAvailable(e.target.value === "true")}
            className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
          >
            <option value="false">No disponible</option>
            <option value="true">Disponible (horario especial)</option>
          </select>
        </div>

        {available && (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
            />
          </div>
        )}

        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full">
          <Plus className="mr-2 size-4" />
          {isSubmitting ? "Guardando..." : "Agregar excepción"}
        </Button>
      </div>
    </form>
  );
}
