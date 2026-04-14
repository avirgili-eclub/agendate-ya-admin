import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import { fetchLocationResources } from "@/features/agenda/agenda-service";
import {
  DAY_NAMES,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
  fetchAvailabilityOverrides,
  fetchAvailabilityRules,
  replaceAvailabilityRules,
  toAvailabilityFriendlyMessage,
  type AvailabilityRule,
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
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

type Feedback = { tone: "success" | "error"; message: string } | null;

type WeeklyTemplateInput = {
  startTime: string;
  endTime: string;
  activeDays: number[];
};

type TimeBlock = {
  startTime: string;
  endTime: string;
};

type WeeklyDraft = Record<number, TimeBlock[]>;

type WeeklyConfirmAction = {
  mode: "save" | "restore";
  totalBlocks: number;
  removedDays: string[];
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

function createEmptyDraft(): WeeklyDraft {
  return {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
}

function toUiTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function buildWeeklyDraft(rules: AvailabilityRule[]): WeeklyDraft {
  const draft = createEmptyDraft();
  for (const rule of rules) {
    draft[rule.dayOfWeek].push({
      startTime: toUiTime(rule.startTime),
      endTime: toUiTime(rule.endTime),
    });
  }
  for (const day of Object.keys(draft)) {
    const dayNumber = Number(day);
    draft[dayNumber].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return draft;
}

function cloneDraft(draft: WeeklyDraft): WeeklyDraft {
  return {
    0: draft[0].map((block) => ({ ...block })),
    1: draft[1].map((block) => ({ ...block })),
    2: draft[2].map((block) => ({ ...block })),
    3: draft[3].map((block) => ({ ...block })),
    4: draft[4].map((block) => ({ ...block })),
    5: draft[5].map((block) => ({ ...block })),
    6: draft[6].map((block) => ({ ...block })),
  };
}

function draftToRuleInputs(resourceId: string, draft: WeeklyDraft): CreateRuleInput[] {
  return Object.entries(draft).flatMap(([dayOfWeek, blocks]) =>
    blocks.map((block) => ({
      resourceId,
      dayOfWeek: Number(dayOfWeek),
      startTime: block.startTime,
      endTime: block.endTime,
      validFrom: undefined,
      validUntil: undefined,
    })),
  );
}

function serializeDraft(draft: WeeklyDraft): string {
  const normalized = Object.keys(draft)
    .map((day) => Number(day))
    .sort((a, b) => a - b)
    .map((day) => ({
      day,
      blocks: [...draft[day]].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  return JSON.stringify(normalized);
}

function validateWeeklyDraft(draft: WeeklyDraft): string[] {
  const errors: string[] = [];

  for (const dayOfWeek of Object.keys(draft).map(Number)) {
    const blocks = [...draft[dayOfWeek]].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const seenStarts = new Set<string>();

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];

      if (!block.startTime || !block.endTime) {
        errors.push(`${DAY_NAMES[dayOfWeek]}: cada bloque requiere hora de inicio y fin.`);
      }

      if (block.startTime >= block.endTime) {
        errors.push(`${DAY_NAMES[dayOfWeek]}: la hora de inicio debe ser menor a la hora de fin.`);
      }

      if (seenStarts.has(block.startTime)) {
        errors.push(`${DAY_NAMES[dayOfWeek]}: hay bloques duplicados con inicio ${block.startTime}.`);
      }
      seenStarts.add(block.startTime);

      if (i > 0) {
        const previous = blocks[i - 1];
        if (block.startTime < previous.endTime) {
          errors.push(`${DAY_NAMES[dayOfWeek]}: hay bloques horarios solapados.`);
        }
      }
    }
  }

  return errors;
}

export function AvailabilityPage() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const currentResourceId = session.user?.resourceId;
  const isProfessional = currentRole === "PROFESSIONAL";

  const [selectedLocationName, setSelectedLocationName] = useState("Todas las ubicaciones");
  const [selectedResourceId, setSelectedResourceId] = useState(
    isProfessional && currentResourceId ? currentResourceId : ""
  );
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
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>(createEmptyDraft);
  const [loadedWeeklyDraft, setLoadedWeeklyDraft] = useState<WeeklyDraft>(createEmptyDraft);
  const [weeklyConfirmAction, setWeeklyConfirmAction] = useState<WeeklyConfirmAction | null>(null);

  const locationsQuery = useQuery({
    queryKey: ["availability", "locations"],
    queryFn: fetchResourceLocations,
    staleTime: 60_000,
    enabled: !isProfessional,
  });

  const resourcesQuery = useResourcesQuery({
    search: "",
    location: selectedLocationName,
    page: 0,
    pageSize: 100,
  }, {
    enabled: !isProfessional,
  });

  const effectiveResourceId = isProfessional && currentResourceId ? currentResourceId : selectedResourceId;

  const rulesQuery = useQuery({
    queryKey: ["availability", "rules", effectiveResourceId],
    queryFn: () => fetchAvailabilityRules(effectiveResourceId),
    enabled: !!effectiveResourceId,
    staleTime: 30_000,
  });

  const overridesQuery = useQuery({
    queryKey: ["availability", "overrides", effectiveResourceId],
    queryFn: () => fetchAvailabilityOverrides(effectiveResourceId),
    enabled: !!effectiveResourceId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!rulesQuery.data) {
      return;
    }

    const nextDraft = buildWeeklyDraft(rulesQuery.data);
    setWeeklyDraft(nextDraft);
    setLoadedWeeklyDraft(cloneDraft(nextDraft));
  }, [rulesQuery.data]);

  const locations = useMemo(
    () => ["Todas las ubicaciones", ...(locationsQuery.data ?? []).map((loc) => loc.name)],
    [locationsQuery.data],
  );

  const availableResources = useMemo(() => resourcesQuery.data?.data ?? [], [resourcesQuery.data]);
  const scopedResources = useMemo(() => {
    if (!isProfessional || !currentResourceId) {
      return availableResources;
    }

    return availableResources.filter((resource) => resource.id === currentResourceId);
  }, [availableResources, isProfessional, currentResourceId]);

  useEffect(() => {
    if (!isProfessional || !currentResourceId) {
      return;
    }

    if (selectedResourceId !== currentResourceId) {
      setSelectedResourceId(currentResourceId);
    }
  }, [isProfessional, currentResourceId, selectedResourceId]);

  const replaceRulesMutation = useMutation({
    mutationFn: async (draft: WeeklyDraft) => {
      if (!effectiveResourceId) {
        throw new Error("Selecciona un recurso para guardar disponibilidad.");
      }
      const rules = draftToRuleInputs(effectiveResourceId, draft);
      return replaceAvailabilityRules(effectiveResourceId, { rules });
    },
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Horarios actualizados correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "rules", effectiveResourceId] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAvailabilityFriendlyMessage(appError) });
    },
  });

  const weeklyValidationErrors = useMemo(() => validateWeeklyDraft(weeklyDraft), [weeklyDraft]);
  const hasWeeklyChanges = useMemo(
    () => serializeDraft(weeklyDraft) !== serializeDraft(loadedWeeklyDraft),
    [weeklyDraft, loadedWeeklyDraft],
  );

  const createOverrideMutation = useMutation({
    mutationFn: createAvailabilityOverride,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Excepción creada correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["availability", "overrides", effectiveResourceId] });
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
      void queryClient.invalidateQueries({ queryKey: ["availability", "overrides", effectiveResourceId] });
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

      await Promise.all(
        uniqueResourceIds.map((resourceId) =>
          replaceAvailabilityRules(resourceId, {
            rules: gatherRuleInputs([resourceId], template),
          }),
        ),
      );
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
      await Promise.all(
        resources.map((resource) =>
          replaceAvailabilityRules(resource.id, {
            rules: gatherRuleInputs([resource.id], template),
          }),
        ),
      );
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

  function toggleWeeklyDay(dayOfWeek: number) {
    setWeeklyDraft((prev) => {
      const next = cloneDraft(prev);
      if (next[dayOfWeek].length > 0) {
        next[dayOfWeek] = [];
      } else {
        next[dayOfWeek] = [{ startTime: "09:00", endTime: "18:00" }];
      }
      return next;
    });
  }

  function addWeeklyBlock(dayOfWeek: number) {
    setWeeklyDraft((prev) => {
      const next = cloneDraft(prev);
      next[dayOfWeek].push({ startTime: "09:00", endTime: "18:00" });
      return next;
    });
  }

  function updateWeeklyBlock(dayOfWeek: number, index: number, patch: Partial<TimeBlock>) {
    setWeeklyDraft((prev) => {
      const next = cloneDraft(prev);
      next[dayOfWeek][index] = {
        ...next[dayOfWeek][index],
        ...patch,
      };
      return next;
    });
  }

  function removeWeeklyBlock(dayOfWeek: number, index: number) {
    setWeeklyDraft((prev) => {
      const next = cloneDraft(prev);
      next[dayOfWeek] = next[dayOfWeek].filter((_, blockIndex) => blockIndex !== index);
      return next;
    });
  }

  function handleWeeklySaveRequest() {
    if (!effectiveResourceId) {
      return;
    }

    if (weeklyValidationErrors.length > 0 || !hasWeeklyChanges) {
      return;
    }

    const removedDays = Object.keys(loadedWeeklyDraft)
      .map(Number)
      .filter((day) => loadedWeeklyDraft[day].length > 0 && weeklyDraft[day].length === 0)
      .map((day) => DAY_NAMES[day]);

    const totalBlocks = Object.values(weeklyDraft).reduce((sum, blocks) => sum + blocks.length, 0);
    setWeeklyConfirmAction({
      mode: "save",
      totalBlocks,
      removedDays,
    });
  }

  function handleRestoreLocationDefaultsRequest() {
    if (!effectiveResourceId) {
      return;
    }

    const removedDays = Object.keys(loadedWeeklyDraft)
      .map(Number)
      .filter((day) => loadedWeeklyDraft[day].length > 0)
      .map((day) => DAY_NAMES[day]);

    setWeeklyConfirmAction({
      mode: "restore",
      totalBlocks: 0,
      removedDays,
    });
  }

  async function handleConfirmWeeklyAction() {
    if (!weeklyConfirmAction) {
      return;
    }

    try {
      if (weeklyConfirmAction.mode === "save") {
        await replaceRulesMutation.mutateAsync(weeklyDraft);
      } else {
        await replaceRulesMutation.mutateAsync(createEmptyDraft());
      }
      setWeeklyConfirmAction(null);
    } catch {
      // Feedback is already handled by mutation callbacks.
    }
  }

  return (
    <div className="space-y-6">
      <PageCard>
        <div className="mb-6">
          <p className="mt-1 text-sm text-primary-light">
            {isProfessional
              ? "Gestiona tu disponibilidad personal."
              : "Configura disponibilidad global y por localidad. La configuración por localidad pisa la global."}
          </p>
        </div>

        {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

        {/* Error state for PROFESSIONAL without resourceId */}
        {isProfessional && !currentResourceId && (
          <ErrorState
            title="Configuración incompleta"
            message="Tu cuenta no tiene un recurso asignado. Contacta al administrador para resolver este problema."
          />
        )}

        {!isProfessional && locationsQuery.isLoading && <LoadingState message="Cargando localidades..." />}
        {!isProfessional && locationsQuery.isError && (
          <ErrorState
            title="No se pudieron cargar localidades"
            message="Reintenta para continuar con la configuración de disponibilidad."
            onRetry={() => void locationsQuery.refetch()}
          />
        )}

        {!isProfessional && !locationsQuery.isLoading && !locationsQuery.isError && (locationsQuery.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={Calendar}
            title="Sin localidades"
            description="No hay localidades disponibles para configurar horarios."
          />
        )}

        {/* Global and Location templates - hidden for PROFESSIONAL */}
        {!isProfessional && (
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
        )}

        {!isProfessional && (
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
        )}

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
                if (isProfessional) {
                  return;
                }
                setSelectedLocationName(e.target.value);
                setSelectedResourceId("");
              }}
              disabled={isProfessional}
              className="flex-1 rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary disabled:bg-neutral"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={effectiveResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              disabled={isProfessional || scopedResources.length === 0}
              className="flex-1 rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary disabled:bg-neutral"
            >
              <option value="">Selecciona un recurso</option>
              {scopedResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.locationName})
                </option>
              ))}
            </select>
          </div>
          {scopedResources.length === 0 && selectedLocationName !== "Todas las ubicaciones" && !isProfessional && (
            <p className="mt-2 text-xs text-primary-light">No hay recursos activos en esta localidad.</p>
          )}
        </div>

        {!effectiveResourceId && (
          <div className="rounded-lg border border-neutral-dark bg-neutral p-8 text-center">
            <Clock className="mx-auto mb-3 size-12 text-primary-light" />
            <p className="text-sm text-primary-light">Selecciona un recurso para configurar disponibilidad puntual.</p>
          </div>
        )}

        {effectiveResourceId && (
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
                    <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary-light">
                      Este recurso no tiene reglas personalizadas. Si guardas sin bloques, seguirá usando el horario de
                      la localidad.
                    </div>
                  )}

                  {weeklyValidationErrors.length > 0 && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-medium">Corrige estos errores antes de guardar:</p>
                      <ul className="mt-1 list-disc pl-5">
                        {weeklyValidationErrors.map((errorMessage) => (
                          <li key={errorMessage}>{errorMessage}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <WeeklyRulesEditor
                    draft={weeklyDraft}
                    onToggleDay={toggleWeeklyDay}
                    onAddBlock={addWeeklyBlock}
                    onUpdateBlock={updateWeeklyBlock}
                    onRemoveBlock={removeWeeklyBlock}
                  />

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={handleRestoreLocationDefaultsRequest}
                      disabled={replaceRulesMutation.isPending}
                    >
                      Restaurar horarios de la localidad
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setWeeklyDraft(cloneDraft(loadedWeeklyDraft))}
                      disabled={!hasWeeklyChanges || replaceRulesMutation.isPending}
                    >
                      Descartar cambios
                    </Button>
                    <Button
                      onClick={handleWeeklySaveRequest}
                      disabled={!hasWeeklyChanges || weeklyValidationErrors.length > 0 || replaceRulesMutation.isPending}
                    >
                      {replaceRulesMutation.isPending ? "Guardando..." : "Guardar horarios"}
                    </Button>
                  </div>
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
                    resourceId={effectiveResourceId}
                    onSubmit={async (input) => {
                      await createOverrideMutation.mutateAsync(input);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={Boolean(weeklyConfirmAction)}
          title={weeklyConfirmAction?.mode === "restore" ? "Restaurar horario de localidad" : "Confirmar actualización de horarios"}
          tone="warning"
          confirmLabel={weeklyConfirmAction?.mode === "restore" ? "Sí, restaurar" : "Sí, guardar cambios"}
          pendingLabel="Guardando..."
          isPending={replaceRulesMutation.isPending}
          onClose={() => {
            if (!replaceRulesMutation.isPending) {
              setWeeklyConfirmAction(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmWeeklyAction();
          }}
          message={
            weeklyConfirmAction?.mode === "restore"
              ? "Se eliminarán todas las reglas personalizadas y este recurso volverá a usar el horario de su localidad."
              : `Se guardarán ${weeklyConfirmAction?.totalBlocks ?? 0} bloque(s) horarios para este recurso.`
          }
        >
          {weeklyConfirmAction?.removedDays.length ? (
            <p>
              Días removidos: <strong className="text-primary">{weeklyConfirmAction.removedDays.join(", ")}</strong>
            </p>
          ) : null}
          <p>
            Esta acción reemplaza todas las reglas actuales del recurso en una sola operación.
          </p>
        </ConfirmDialog>
      </PageCard>
    </div>
  );
}

type WeeklyRulesEditorProps = {
  draft: WeeklyDraft;
  onToggleDay: (dayOfWeek: number) => void;
  onAddBlock: (dayOfWeek: number) => void;
  onUpdateBlock: (dayOfWeek: number, index: number, patch: Partial<TimeBlock>) => void;
  onRemoveBlock: (dayOfWeek: number, index: number) => void;
};

function WeeklyRulesEditor({
  draft,
  onToggleDay,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
}: WeeklyRulesEditorProps) {
  return (
    <div className="space-y-3">
      {DAY_NAMES.map((dayName, dayOfWeek) => {
        const blocks = draft[dayOfWeek];
        const isEnabled = blocks.length > 0;

        return (
          <div key={dayName} className="rounded-md border border-neutral-dark p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{dayName}</p>
                <p className="text-xs text-primary-light">
                  {isEnabled ? "Disponible" : "No disponible"}
                </p>
              </div>
              <Button type="button" size="sm" variant={isEnabled ? "outline" : "primary"} onClick={() => onToggleDay(dayOfWeek)}>
                {isEnabled ? "Desactivar" : "Activar"}
              </Button>
            </div>

            {isEnabled && (
              <div className="mt-3 space-y-2">
                {blocks.map((block, index) => (
                  <div key={`${dayName}-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="time"
                      value={block.startTime}
                      onChange={(event) => onUpdateBlock(dayOfWeek, index, { startTime: event.target.value })}
                      className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                    />
                    <input
                      type="time"
                      value={block.endTime}
                      onChange={(event) => onUpdateBlock(dayOfWeek, index, { endTime: event.target.value })}
                      className="rounded-md border border-neutral-dark bg-white px-2 py-2 text-sm text-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => onRemoveBlock(dayOfWeek, index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <Button type="button" size="sm" variant="outline" onClick={() => onAddBlock(dayOfWeek)}>
                  <Plus className="mr-2 size-4" />
                  Agregar bloque
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
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
