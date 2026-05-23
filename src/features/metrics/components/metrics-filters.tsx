import { useQuery } from "@tanstack/react-query";

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
  showLocationFilter: boolean;
  onChange: (filters: MetricsFilters) => void;
};

export function MetricsFilters({ filters, showLocationFilter, onChange }: MetricsFiltersProps) {
  const locationsQuery = useQuery({
    queryKey: ["metrics", "locations"],
    queryFn: fetchLocations,
    enabled: showLocationFilter,
    staleTime: 5 * 60_000,
  });

  function updateFilters(patch: Partial<MetricsFilters>) {
    onChange({ ...filters, ...patch });
  }

  function toggleLocation(locationId: string) {
    const selected = new Set(filters.locationIds ?? []);
    if (selected.has(locationId)) {
      selected.delete(locationId);
    } else {
      selected.add(locationId);
    }
    updateFilters({ locationIds: Array.from(selected) });
  }

  return (
    <section className="rounded-xl border border-neutral-dark bg-neutral-light p-4 shadow-sm" aria-label="Filtros de metricas">
      <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
        <label className="space-y-1 text-sm font-medium text-primary-dark">
          <span>Desde</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilters({ from: event.target.value })}
            className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary-light"
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-primary-dark">
          <span>Hasta</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilters({ to: event.target.value })}
            className="h-11 w-full rounded-md border border-neutral-dark bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary-light"
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-primary-dark">
          <span>Agrupar por</span>
          <Select
            value={filters.granularity ?? "day"}
            onValueChange={(value) => updateFilters({ granularity: value as MetricsGranularity })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona agrupación" />
            </SelectTrigger>
            <SelectContent>
              {GRANULARITIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button
          type="button"
          variant="outline"
          onClick={() => updateFilters({ locationIds: [] })}
          disabled={!showLocationFilter || !(filters.locationIds?.length)}
        >
          Limpiar locales
        </Button>
      </div>

      {showLocationFilter && (
        <div className="mt-4 border-t border-neutral-dark pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-dark">Locales</p>
              <p className="text-xs text-primary-light">Filtra por una o mas sedes del negocio.</p>
            </div>
            {locationsQuery.isLoading && <span className="text-xs text-primary-light">Cargando locales...</span>}
          </div>

          {locationsQuery.isError && (
            <p className="mt-3 text-sm text-red-700">No pudimos cargar los locales para filtrar.</p>
          )}

          {locationsQuery.data && locationsQuery.data.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {locationsQuery.data.map((location) => {
                const checked = Boolean(filters.locationIds?.includes(location.id));
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
    </section>
  );
}
