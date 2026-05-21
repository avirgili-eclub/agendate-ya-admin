import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { fetchAvailabilityRules, type AvailabilityRule } from "@/features/availability/availability-service";
import type { MembershipOccupancySlot } from "@/features/memberships/membership-types";
import { useMembershipOccupancyQuery } from "@/features/memberships/use-memberships-query";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import type { ResourceCardItem } from "@/features/resources/resources-service";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { LoadingState } from "@/shared/ui/loading-state";
import { PageCard } from "@/shared/ui/page-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { DAY_NAMES } from "./membership-detail-panel";

const SLOT_STEP_MINUTES = 60;

type OccupancyDisplaySlot = {
  dayOfWeek: number;
  startTime: string;
  activeSubscriptions: number;
  availableSlots: number;
  capacity: number;
  source: "availability" | "occupancy";
};

function todayAsDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeOccupancyTime(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function snapToStep(value: string, stepMinutes: number): string {
  const total = timeToMinutes(value);
  return minutesToTime(Math.floor(total / stepMinutes) * stepMinutes);
}

export function occupancySlotKey(dayOfWeek: number, startTime: string) {
  return `${dayOfWeek}-${normalizeOccupancyTime(startTime)}`;
}

function normalizeDayOfWeek(value: number) {
  return Math.min(Math.max(Math.trunc(value), 0), 6);
}

function getCapacity(occupancyCapacity: number, resource?: ResourceCardItem) {
  return occupancyCapacity || resource?.capacity || 0;
}

function isRuleActiveOn(rule: AvailabilityRule, validOn: string): boolean {
  if (rule.validFrom && validOn < rule.validFrom) {
    return false;
  }
  if (rule.validUntil && validOn > rule.validUntil) {
    return false;
  }
  return true;
}

function expandRuleToSlots(rule: AvailabilityRule, stepMinutes: number): string[] {
  const startMinutes = timeToMinutes(normalizeOccupancyTime(rule.startTime));
  const endMinutes = timeToMinutes(normalizeOccupancyTime(rule.endTime));
  const snappedStart = Math.floor(startMinutes / stepMinutes) * stepMinutes;
  const slots: string[] = [];

  for (let t = snappedStart; t + stepMinutes <= endMinutes; t += stepMinutes) {
    if (t < startMinutes) continue;
    slots.push(minutesToTime(t));
  }

  return slots;
}

function buildDisplaySlots({
  rules,
  occupancy,
  capacity,
  validOn,
}: {
  rules: AvailabilityRule[];
  occupancy: MembershipOccupancySlot[];
  capacity: number;
  validOn: string;
}) {
  const displaySlots = new Map<string, OccupancyDisplaySlot>();

  const activeRules = rules.filter((rule) => isRuleActiveOn(rule, validOn));

  for (const rule of activeRules) {
    const dayOfWeek = normalizeDayOfWeek(rule.dayOfWeek);
    const slotStarts = expandRuleToSlots(rule, SLOT_STEP_MINUTES);

    for (const startTime of slotStarts) {
      const key = occupancySlotKey(dayOfWeek, startTime);
      if (displaySlots.has(key)) continue;
      displaySlots.set(key, {
        dayOfWeek,
        startTime,
        activeSubscriptions: 0,
        availableSlots: capacity,
        capacity,
        source: "availability",
      });
    }
  }

  for (const occupied of occupancy) {
    const dayOfWeek = normalizeDayOfWeek(occupied.dayOfWeek);
    const normalizedStart = normalizeOccupancyTime(occupied.startTime);
    const snappedStart = snapToStep(normalizedStart, SLOT_STEP_MINUTES);
    const key = occupancySlotKey(dayOfWeek, snappedStart);
    const existing = displaySlots.get(key);

    if (existing) {
      const totalActive = existing.activeSubscriptions + occupied.activeSubscriptions;
      const slotCapacity = existing.capacity || capacity;
      displaySlots.set(key, {
        ...existing,
        activeSubscriptions: totalActive,
        availableSlots: Math.max(slotCapacity - totalActive, 0),
      });
      continue;
    }

    const inferredCapacity = capacity || occupied.activeSubscriptions + occupied.availableSlots;
    displaySlots.set(key, {
      dayOfWeek,
      startTime: snappedStart,
      activeSubscriptions: occupied.activeSubscriptions,
      availableSlots: occupied.availableSlots,
      capacity: inferredCapacity,
      source: "occupancy",
    });
  }

  return [...displaySlots.values()].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }

    return left.startTime.localeCompare(right.startTime);
  });
}

function getSlotClassName(slot: OccupancyDisplaySlot) {
  if (slot.availableSlots <= 0) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (slot.activeSubscriptions > 0) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-success/30 bg-success/10 text-success-dark";
}

function getSlotAvailabilityLabel(slot: OccupancyDisplaySlot) {
  if (slot.capacity > 0) {
    return `${slot.activeSubscriptions}/${slot.capacity}`;
  }

  return `${slot.activeSubscriptions} ocupadas`;
}

export function MembershipOccupancyTab() {
  const [resourceId, setResourceId] = useState("");
  const [validOn, setValidOn] = useState(todayAsDateInput);

  const resourcesQuery = useResourcesQuery({ search: "", location: "", page: 0, pageSize: 200 });
  const activeResources = useMemo(
    () => (resourcesQuery.data?.data ?? []).filter((resource) => resource.active),
    [resourcesQuery.data?.data],
  );
  const selectedResource = activeResources.find((resource) => resource.id === resourceId);

  useEffect(() => {
    if (!resourceId && activeResources.length > 0) {
      setResourceId(activeResources[0].id);
    }
  }, [activeResources, resourceId]);

  const occupancyQuery = useMembershipOccupancyQuery(resourceId ? { resourceId, validOn } : null);
  const rulesQuery = useQuery({
    queryKey: ["availability-rules", resourceId],
    queryFn: () => fetchAvailabilityRules(resourceId),
    enabled: Boolean(resourceId),
    staleTime: 60_000,
  });

  const capacity = getCapacity(occupancyQuery.data?.capacity ?? 0, selectedResource);
  const displaySlots = buildDisplaySlots({
    rules: rulesQuery.data ?? [],
    occupancy: occupancyQuery.data?.occupancy ?? [],
    capacity,
    validOn,
  });
  const slotsByDay = DAY_NAMES.map((_, dayIndex) =>
    displaySlots.filter((slot) => slot.dayOfWeek === dayIndex),
  );

  if (resourcesQuery.isLoading) {
    return <LoadingState message="Cargando recursos..." />;
  }

  if (resourcesQuery.isError) {
    return (
      <ErrorState
        title="Error al cargar recursos"
        message="No pudimos cargar los recursos para revisar cupos."
        onRetry={() => void resourcesQuery.refetch()}
      />
    );
  }

  if (activeResources.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin recursos activos"
        description="Crea o activa un recurso con capacidad para revisar cupos de clases fijas."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageCard>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Recurso o sala</span>
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar recurso" />
              </SelectTrigger>
              <SelectContent>
                {activeResources.map((resource) => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name} · {resource.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary-dark">Valido en</span>
            <input
              type="date"
              value={validOn}
              onChange={(event) => setValidOn(event.target.value)}
              className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              void occupancyQuery.refetch();
              void rulesQuery.refetch();
            }}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        </div>
      </PageCard>

      {rulesQuery.isError ? (
        <FeedbackBanner
          tone="warning"
          message="No se pudieron cargar las reglas de disponibilidad. Se muestran solo horarios con ocupacion registrada."
        />
      ) : null}

      {occupancyQuery.isError ? (
        <ErrorState
          title="Error al cargar cupos"
          message="No pudimos cargar la ocupacion para este recurso."
          onRetry={() => void occupancyQuery.refetch()}
        />
      ) : null}

      <PageCard>
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Capacidad</p>
            <p className="mt-1 text-lg font-semibold text-primary">{capacity || "Sin dato"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Slots visibles</p>
            <p className="mt-1 text-lg font-semibold text-primary">{displaySlots.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Slots llenos</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {displaySlots.filter((slot) => slot.availableSlots <= 0).length}
            </p>
          </div>
        </div>

        {occupancyQuery.isLoading || rulesQuery.isLoading ? (
          <LoadingState message="Cargando ocupacion..." />
        ) : displaySlots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin horarios para mostrar"
            description="No hay reglas de disponibilidad ni ocupacion registrada para este recurso."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {DAY_NAMES.map((day, dayIndex) => (
              <section key={day} className="rounded-lg border border-neutral-dark bg-white p-3">
                <h3 className="text-sm font-semibold text-primary">{day}</h3>
                <div className="mt-3 space-y-2">
                  {slotsByDay[dayIndex].length > 0 ? (
                    slotsByDay[dayIndex].map((slot) => (
                      <div
                        key={`${slot.dayOfWeek}-${slot.startTime}`}
                        className={`rounded-md border px-2 py-2 text-sm ${getSlotClassName(slot)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{slot.startTime}</span>
                          <span className="text-xs font-semibold">{getSlotAvailabilityLabel(slot)}</span>
                        </div>
                        <p className="mt-1 text-xs">
                          {slot.availableSlots <= 0 ? "Lleno" : `${slot.availableSlots} libres`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md bg-neutral px-2 py-3 text-center text-xs text-primary-light">
                      Sin horarios
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  );
}
