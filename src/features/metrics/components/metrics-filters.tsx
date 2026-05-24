import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";

import { fetchLocations } from "@/features/locations/locations-service";
import type { MetricsFilters, MetricsGranularity } from "@/features/metrics/metrics-types";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const GRANULARITIES: Array<{ value: MetricsGranularity; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

type MetricsFiltersProps = {
  filters: MetricsFilters;
  defaultFilters: MetricsFilters;
  showLocationFilter: boolean;
  onApply: (filters: MetricsFilters) => void;
};

function getGranularityLabel(value: MetricsGranularity | undefined) {
  return GRANULARITIES.find((item) => item.value === (value ?? "day"))?.label ?? "Dia";
}

function formatFilterDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function MetricsFilters({ filters, defaultFilters, showLocationFilter, onApply }: MetricsFiltersProps) {
  const [draftFilters, setDraftFilters] = useState<MetricsFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);
  const locationsQuery = useQuery({
    queryKey: ["metrics", "locations"],
    queryFn: fetchLocations,
    enabled: showLocationFilter,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function updateFilters(patch: Partial<MetricsFilters>) {
    setDraftFilters((current) => ({ ...current, ...patch }));
  }

  function toggleLocation(locationId: string) {
    const selected = new Set(draftFilters.locationIds ?? []);
    if (selected.has(locationId)) {
      selected.delete(locationId);
    } else {
      selected.add(locationId);
    }
    updateFilters({ locationIds: Array.from(selected) });
  }

  function applyFilters() {
    onApply(draftFilters);
    setIsOpen(false);
  }

  function clearFilters() {
    setDraftFilters({ ...defaultFilters, locationIds: [] });
  }

  const locationSummary = showLocationFilter
    ? filters.locationIds?.length
      ? `${filters.locationIds.length} ${filters.locationIds.length === 1 ? "sede" : "sedes"}`
      : "Todas las sedes"
    : null;

  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-3 shadow-sm" aria-label="Filtros de metricas">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-light">Filtros</p>
          <p className="mt-1 text-sm text-primary-dark">
            {formatFilterDate(filters.from)} - {formatFilterDate(filters.to)} · Agrupar por {getGranularityLabel(filters.granularity)}
            {locationSummary ? ` · ${locationSummary}` : ""}
          </p>
        </div>

        <Button type="button" variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => setIsOpen((current) => !current)}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {isOpen ? "Ocultar filtros" : "Filtros"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 border-t border-neutral-dark pt-3">
          <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
            <label className="space-y-1 text-sm font-medium text-primary-dark">
              <span>Desde</span>
              <input
                type="date"
                value={draftFilters.from}
                onChange={(event) => updateFilters({ from: event.target.value })}
                className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary-light"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-primary-dark">
              <span>Hasta</span>
              <input
                type="date"
                value={draftFilters.to}
                onChange={(event) => updateFilters({ to: event.target.value })}
                className="h-10 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary-light"
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-primary-dark">
              <span>Agrupar por</span>
              <Select
                value={draftFilters.granularity ?? "day"}
                onValueChange={(value) => updateFilters({ granularity: value as MetricsGranularity })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecciona agrupación" />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
              <Button type="button" onClick={applyFilters}>
                Buscar
              </Button>
            </div>
          </div>

          {showLocationFilter && (
            <div className="mt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary-dark">Sedes</p>
                  <p className="text-xs text-primary-light">Dejá vacío para ver todas las sedes.</p>
                </div>
                {locationsQuery.isLoading && <span className="text-xs text-primary-light">Cargando sedes...</span>}
              </div>

              {locationsQuery.isError && (
                <p className="mt-3 text-sm text-red-700">No pudimos cargar las sedes para filtrar.</p>
              )}

              {locationsQuery.data && locationsQuery.data.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {locationsQuery.data.map((location) => {
                    const checked = Boolean(draftFilters.locationIds?.includes(location.id));
                    return (
                      <label
                        key={location.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          checked
                            ? "border-primary bg-primary text-white"
                            : "border-neutral-dark bg-white text-primary-dark hover:border-primary-light"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleLocation(location.id)}
                        />
                        {location.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
