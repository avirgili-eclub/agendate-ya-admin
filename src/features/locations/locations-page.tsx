import { useMemo, useState } from "react";
import { Building2, Search, MapPin, Phone, Calendar, ImageIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  toLocationsFriendlyMessage,
  updateLocation,
  type LocationItem,
  type LocationUpsertInput,
} from "@/features/locations/locations-service";
import { LocationFormModal } from "@/features/locations/location-form-modal";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { SidePanel } from "@/shared/ui/side-panel";

function toShortDate(dateTime: string) {
  return new Intl.DateTimeFormat("es-PY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateTime));
}

export function LocationsPage() {
  const queryClient = useQueryClient();
  const userRole = getSessionState().user?.role ?? "";
  const canManageLocations = userRole === "TENANT_ADMIN" || userRole === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [locationPendingDelete, setLocationPendingDelete] = useState<LocationItem | null>(null);

  const locationsQuery = useQuery({
    queryKey: ["locations", "list"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Sede creada correctamente." });
      setCreating(false);
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error) => {
      setFeedback({ tone: "error", message: toLocationsFriendlyMessage(error as unknown as AppError) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LocationUpsertInput }) => updateLocation(id, input),
    onSuccess: (updated) => {
      setFeedback({ tone: "success", message: "Sede actualizada correctamente." });
      setEditingLocation(null);
      setSelectedLocation((previous) => (previous?.id === updated.id ? updated : previous));
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error) => {
      setFeedback({ tone: "error", message: toLocationsFriendlyMessage(error as unknown as AppError) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: (_, id) => {
      setFeedback({ tone: "success", message: "Sede eliminada correctamente." });
      setSelectedLocation((previous) => (previous?.id === id ? null : previous));
      setLocationPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error) => {
      setFeedback({ tone: "error", message: toLocationsFriendlyMessage(error as unknown as AppError) });
      setLocationPendingDelete(null);
    },
  });

  const locations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = locationsQuery.data ?? [];
    if (!term) {
      return all;
    }

    return all.filter((location) => {
      const haystack = [location.name, location.address ?? "", location.phone ?? "", location.id]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [locationsQuery.data, search]);

  return (
    <div className="space-y-4">
      <PageCard className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-lg border border-neutral-dark bg-white pl-10 pr-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="Buscar por nombre, dirección, teléfono o ID..."
          />
        </div>

        <div className="flex w-full justify-end lg:w-auto">
          <Button onClick={() => setCreating(true)} disabled={!canManageLocations}>
            + Nueva sede
          </Button>
        </div>
      </PageCard>

      {!canManageLocations && (
        <FeedbackBanner
          tone="error"
          message="Tu rol actual solo permite visualización. Para crear, editar o eliminar sedes necesitas permisos de administrador."
        />
      )}

      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

      {locationsQuery.isLoading && <LoadingState message="Cargando sedes..." />}

      {locationsQuery.isError && (
        <ErrorState
          title="No se pudieron cargar las sedes"
          message={toLocationsFriendlyMessage(locationsQuery.error as unknown as AppError)}
          onRetry={() => void locationsQuery.refetch()}
        />
      )}

      {locationsQuery.isSuccess && locations.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Sin sedes"
          description="No se encontraron sedes con los filtros actuales."
        />
      )}

      {locationsQuery.isSuccess && locations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((location) => (
            <PageCard key={location.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-primary-dark" title={location.name}>
                    {location.name}
                  </h3>
                  <p className="mt-1 text-xs text-primary-light">ID: {location.id}</p>
                </div>
                <StatusChip
                  tone={location.active ? "success" : "neutral"}
                  label={location.active ? "Activa" : "Inactiva"}
                />
              </div>

              <div className="mt-4 space-y-2 text-sm text-primary-light">
                <p className="truncate" title={location.address ?? "Sin dirección"}>
                  <MapPin className="mr-2 inline size-4" />
                  {location.address ?? "Sin dirección"}
                </p>
                <p className="truncate" title={location.phone ?? "Sin teléfono"}>
                  <Phone className="mr-2 inline size-4" />
                  {location.phone ?? "Sin teléfono"}
                </p>
                <p>
                  <Calendar className="mr-2 inline size-4" />
                  Creada: {toShortDate(location.createdAt)}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLocation(location)}>
                  Ver detalle
                </Button>
                {canManageLocations && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditingLocation(location)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                      onClick={() => setLocationPendingDelete(location)}
                      disabled={deleteMutation.isPending}
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </PageCard>
          ))}
        </div>
      )}

      <LocationFormModal
        mode="create"
        isOpen={creating}
        isLoading={createMutation.isPending}
        error={(createMutation.error as AppError | null) ?? null}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
      />

      <LocationFormModal
        mode="edit"
        initialLocation={editingLocation ?? undefined}
        isOpen={Boolean(editingLocation)}
        isLoading={updateMutation.isPending}
        error={(updateMutation.error as AppError | null) ?? null}
        onClose={() => setEditingLocation(null)}
        onSubmit={async (input) => {
          if (!editingLocation) {
            return;
          }
          await updateMutation.mutateAsync({ id: editingLocation.id, input });
        }}
      />

      <SidePanel
        isOpen={Boolean(selectedLocation)}
        onClose={() => setSelectedLocation(null)}
        title={selectedLocation?.name ?? "Detalle de sede"}
      >
        {selectedLocation && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Nombre</p>
              <p className="text-sm font-semibold text-primary">{selectedLocation.name}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Dirección</p>
              <p className="text-sm text-primary">{selectedLocation.address ?? "No informada"}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Teléfono</p>
              <p className="text-sm text-primary">{selectedLocation.phone ?? "No informado"}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Imagen</p>
              {selectedLocation.imageUrl ? (
                <a
                  href={selectedLocation.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline"
                >
                  <ImageIcon className="size-4" />
                  Ver imagen
                </a>
              ) : (
                <p className="text-sm text-primary">No informada</p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Estado</p>
              <div className="mt-1">
                <StatusChip
                  tone={selectedLocation.active ? "success" : "neutral"}
                  label={selectedLocation.active ? "Activa" : "Inactiva"}
                />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Actualizada</p>
              <p className="text-sm text-primary">{toShortDate(selectedLocation.updatedAt)}</p>
            </div>
          </div>
        )}
      </SidePanel>

      <ConfirmDialog
        isOpen={Boolean(locationPendingDelete)}
        title="Confirmar eliminación"
        message={
          <>
            Vas a eliminar la sede <strong className="text-primary">{locationPendingDelete?.name ?? ""}</strong>.
          </>
        }
        isPending={deleteMutation.isPending}
        pendingLabel="Eliminando..."
        confirmLabel="Eliminar sede"
        tone="danger"
        onClose={() => setLocationPendingDelete(null)}
        onConfirm={() => {
          if (!locationPendingDelete) {
            return;
          }
          deleteMutation.mutate(locationPendingDelete.id);
        }}
      >
        <p>Esta acción no se puede deshacer.</p>
        <p>
          Si existen recursos o bookings activos asociados, la operación fallará y deberás resolver
          esas dependencias primero.
        </p>
      </ConfirmDialog>
    </div>
  );
}