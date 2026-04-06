import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import {
  assignServicesToResource,
  createResource,
  fetchResourceLocations,
  fetchServicesCatalog,
  toResourcesOperationError,
  transferResource,
  updateResourceDetails,
  updateResourceActiveStatus,
  type ResourceListResult,
  type ResourceCardItem,
  type ResourceServiceCatalogItem,
} from "@/features/resources/resources-service";
import { ManageServicesModal, ResourceUpsertModal, TransferResourceModal } from "@/features/resources/resource-modals";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useFeedback } from "@/shared/notifications/use-feedback";

const PAGE_SIZE = 4;

function ResourceTypeBadge({ type }: { type: ResourceCardItem["type"] }) {
  if (type === "PROFESSIONAL") {
    return <StatusChip tone="success" label="Profesional" />;
  }
  if (type === "TABLE") {
    return <StatusChip tone="neutral" label="Mesa" />;
  }
  if (type === "ROOM") {
    return <StatusChip tone="neutral" label="Sala" />;
  }
  return <StatusChip tone="warning" label="Equipo" />;
}

export function ResourcesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("Todas las ubicaciones");
  const [page, setPage] = useState(0);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("resource");
  const [creating, setCreating] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceCardItem | null>(null);
  const [transferingResource, setTransferingResource] = useState<ResourceCardItem | null>(null);
  const [managingServicesResource, setManagingServicesResource] = useState<ResourceCardItem | null>(null);

  const locationsQuery = useQuery({
    queryKey: ["resources", "locations"],
    queryFn: fetchResourceLocations,
    staleTime: 60_000,
  });

  const servicesCatalogQuery = useQuery({
    queryKey: ["resources", "services-catalog"],
    queryFn: fetchServicesCatalog,
    staleTime: 60_000,
  });

  const locations = useMemo(
    () => ["Todas las ubicaciones", ...(locationsQuery.data ?? []).map((item) => item.name)],
    [locationsQuery.data],
  );
  const servicesCatalog = useMemo<ResourceServiceCatalogItem[]>(
    () => servicesCatalogQuery.data ?? [],
    [servicesCatalogQuery.data],
  );

  const resourcesQuery = useResourcesQuery({ search, location, page, pageSize: PAGE_SIZE });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateResourceActiveStatus(id, active),
    onSuccess: () => {
      showFeedback("success", "Estado del equipo actualizado.");
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toResourcesOperationError(appError));
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      showFeedback("success", "Equipo creado correctamente.");
      setCreating(false);
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toResourcesOperationError(appError));
    },
  });

  const editResourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateResourceDetails>[1] }) =>
      updateResourceDetails(id, payload),
    onSuccess: () => {
      showFeedback("success", "Equipo actualizado correctamente.");
      setEditingResource(null);
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toResourcesOperationError(appError));
    },
  });

  const transferResourceMutation = useMutation({
    mutationFn: ({ id, locationName, clearSchedule }: { id: string; locationName: string; clearSchedule: boolean }) =>
      transferResource(id, { locationName, clearSchedule }),
    onSuccess: () => {
      showFeedback("success", "Equipo transferido correctamente.");
      setTransferingResource(null);
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toResourcesOperationError(appError));
    },
  });

  const manageServicesMutation = useMutation({
    mutationFn: ({ id, serviceIds }: { id: string; serviceIds: string[] }) =>
      assignServicesToResource(id, serviceIds),
    onSuccess: () => {
      showFeedback("success", "Servicios del equipo actualizados.");
      setManagingServicesResource(null);
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toResourcesOperationError(appError));
    },
  });

  const data = (resourcesQuery.data ?? { data: [], total: 0 }) as ResourceListResult;
  const total = data.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cards = data.data;

  const errorMessage = resourcesQuery.isError
    ? toResourcesOperationError(resourcesQuery.error as unknown as AppError)
    : null;

  const supportDataError = locationsQuery.isError || servicesCatalogQuery.isError;

  return (
    <div className="space-y-4">
      <PageCard className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-11 w-full rounded-lg border border-neutral-dark bg-white pl-10 pr-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="Filtrar por nombre, servicio o ID..."
          />
        </div>

        <div className="flex w-full gap-2 lg:w-auto">
          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(0);
            }}
            className="h-11 min-w-56 flex-1 rounded-lg border border-neutral-dark bg-white px-3 text-sm outline-none ring-primary-light focus:ring-2"
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button variant="outline" className="h-11 px-3">
            <SlidersHorizontal className="size-4" />
          </Button>
          <Button
            className="h-11 whitespace-nowrap"
            onClick={() => setCreating(true)}
            disabled={locationsQuery.isLoading || supportDataError}
          >
            + Nuevo equipo
          </Button>
        </div>
      </PageCard>

      <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />

      {errorMessage ? (
        <PageCard>
          <p className="text-sm text-red-700">{errorMessage}</p>
        </PageCard>
      ) : null}

      {supportDataError ? (
        <PageCard>
          <p className="text-sm text-red-700">No pudimos cargar ubicaciones o servicios para equipos.</p>
        </PageCard>
      ) : null}

      {resourcesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <PageCard key={`resource-skeleton-${idx}`} className="animate-pulse">
              <div className="h-4 w-40 rounded bg-neutral-dark" />
              <div className="mt-2 h-3 w-28 rounded bg-neutral-dark" />
              <div className="mt-5 h-10 rounded bg-neutral-dark" />
            </PageCard>
          ))}
        </div>
      ) : null}

      {!resourcesQuery.isLoading && !errorMessage && cards.length === 0 ? (
        <PageCard>
          <h2 className="text-lg font-semibold text-primary">Sin resultados</h2>
          <p className="mt-1 text-sm text-primary-light">No se encontraron equipos con los filtros actuales.</p>
        </PageCard>
      ) : null}

      {!resourcesQuery.isLoading && !errorMessage && cards.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((resource: ResourceCardItem) => (
              <PageCard key={resource.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-dark">{resource.name}</h3>
                    <p className="text-sm text-primary-light">{resource.locationName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <StatusChip tone={resource.active ? "success" : "neutral"} label={resource.active ? "Activo" : "Inactivo"} />
                    <div>
                      <ResourceTypeBadge type={resource.type} />
                    </div>
                    {!resource.calendarConnected && (
                      <div>
                        <StatusChip tone="warning" label="Sin calendario" />
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-primary-light">Servicios asignados</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {resource.services.map((service: string) => (
                    <span key={service} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {service}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingResource(resource)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setTransferingResource(resource)}
                  >
                    Transferir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setManagingServicesResource(resource)}
                  >
                    Servicios
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      resource.active
                        ? "w-full border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                        : "w-full border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                    }
                    onClick={() => updateResourceMutation.mutate({ id: resource.id, active: !resource.active })}
                    disabled={updateResourceMutation.isPending}
                  >
                    {resource.active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </PageCard>
            ))}
          </div>

          <PageCard className="flex items-center justify-between gap-4">
            <p className="text-sm text-primary-light">
              Mostrando {cards.length} de {total} equipos totales
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <span className="text-sm font-semibold text-primary">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={page >= totalPages - 1}
              >
                Siguiente
              </Button>
            </div>
          </PageCard>
        </>
      ) : null}

      {creating ? (
        <ResourceUpsertModal
          mode="create"
          locations={locations}
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createResourceMutation.mutateAsync(payload);
          }}
        />
      ) : null}

      {editingResource ? (
        <ResourceUpsertModal
          mode="edit"
          initial={editingResource}
          locations={locations}
          onClose={() => setEditingResource(null)}
          onSubmit={async (payload) => {
            await editResourceMutation.mutateAsync({ id: editingResource.id, payload });
          }}
        />
      ) : null}

      {transferingResource ? (
        <TransferResourceModal
          resource={transferingResource}
          locations={locations}
          onClose={() => setTransferingResource(null)}
          onSubmit={async (payload) => {
            await transferResourceMutation.mutateAsync({ id: transferingResource.id, ...payload });
          }}
        />
      ) : null}

      {managingServicesResource ? (
        <ManageServicesModal
          resource={managingServicesResource}
          catalog={servicesCatalog}
          onClose={() => setManagingServicesResource(null)}
          onSubmit={async (selectedServiceIds) => {
            await manageServicesMutation.mutateAsync({
              id: managingServicesResource.id,
              serviceIds: selectedServiceIds,
            });
          }}
        />
      ) : null}
    </div>
  );
}
