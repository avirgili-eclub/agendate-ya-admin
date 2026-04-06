import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Link2, Loader2, RefreshCw, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import { fetchGoogleCalendarAuthStatus } from "@/features/calendar/google-calendar-service";
import {
  fetchResourceCalendarStatus,
  provisionResourceCalendar,
  processFormError,
  type ResourceCardItem,
  type ResourceServiceCatalogItem,
  type ResourceUpsertInput,
} from "@/features/resources/resources-service";
import { useNotifications } from "@/shared/notifications/notification-store";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { Button } from "@/shared/ui/button";
import { TransientFeedback } from "@/shared/ui/transient-feedback";

type ModalShellProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

function ModalShell({ title, children, onClose }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-dark bg-neutral-light p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <button className="rounded-md p-1 text-primary-light hover:bg-neutral" type="button" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ResourceUpsertModalProps = {
  mode: "create" | "edit";
  locations: string[];
  initial?: ResourceCardItem;
  onClose: () => void;
  onSubmit: (payload: ResourceUpsertInput) => Promise<void>;
};

export function ResourceUpsertModal({ mode, locations, initial, onClose, onSubmit }: ResourceUpsertModalProps) {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const userRole = (session.user?.role ?? "").toUpperCase();
  const canProvisionGoogleCalendar = userRole === "TENANT_ADMIN" || userRole === "SUPER_ADMIN";

  const resourceId = initial?.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [locationName, setLocationName] = useState(initial?.locationName ?? locations[1] ?? "");
  const [type, setType] = useState<ResourceCardItem["type"]>(initial?.type ?? "PROFESSIONAL");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 1));
  const [active, setActive] = useState(initial?.active ?? true);
  const [calendarConnected, setCalendarConnected] = useState(Boolean(initial?.calendarConnected));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { feedback, showFeedback, dismissFeedback } = useFeedback("resource");
  const { addNotification } = useNotifications();

  const title = mode === "create" ? "Nuevo equipo" : "Editar equipo";

  useEffect(() => {
    setCalendarConnected(Boolean(initial?.calendarConnected));
  }, [initial?.calendarConnected, initial?.id]);

  const resourceCalendarStatusQuery = useQuery({
    queryKey: ["resource", resourceId, "calendar-status"],
    queryFn: () => fetchResourceCalendarStatus(resourceId!),
    enabled: mode === "edit" && Boolean(resourceId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof resourceCalendarStatusQuery.data === "boolean") {
      setCalendarConnected(resourceCalendarStatusQuery.data);
    }
  }, [resourceCalendarStatusQuery.data]);

  const calendarAuthStatusQuery = useQuery({
    queryKey: ["google-calendar", "auth-status"],
    queryFn: fetchGoogleCalendarAuthStatus,
    enabled: mode === "edit" && Boolean(resourceId) && !calendarConnected && canProvisionGoogleCalendar,
    staleTime: 5 * 60_000,
  });

  const provisionCalendarMutation = useMutation({
    mutationFn: () => provisionResourceCalendar(resourceId!),
    onSuccess: () => {
      setCalendarConnected(true);
      showFeedback("success", `✅ Google Calendar creado para ${name || initial?.name || "este equipo"}`);
      void queryClient.invalidateQueries({ queryKey: ["resource", resourceId, "calendar-status"] });
      void queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;

      if (appError.status === 409) {
        setCalendarConnected(true);
        showFeedback("info", "El equipo ya tiene un calendario asociado.");
        void queryClient.invalidateQueries({ queryKey: ["resource", resourceId, "calendar-status"] });
        void queryClient.invalidateQueries({ queryKey: ["resources"] });
        return;
      }

      if (appError.status === 422) {
        const message = "Primero conectá tu cuenta de Google en Configuración.";
        showFeedback("warning", message, {
          persist: false,
          action: {
            label: "Ir a Configuración",
            href: "/configuracion?tab=integraciones",
          },
        });
        addNotification({
          type: "warning",
          title: "Google Calendar no disponible",
          message,
          category: "resource",
          actionUrl: "/configuracion?tab=integraciones",
        });
        void queryClient.invalidateQueries({ queryKey: ["google-calendar", "auth-status"] });
        return;
      }

      if (appError.status === 500) {
        showFeedback("error", "No se pudo crear el calendario. Intentalo de nuevo.");
        return;
      }

      if (appError.status === 404) {
        showFeedback("error", "No se encontró el recurso. Intentalo de nuevo.");
        return;
      }

      showFeedback("error", "Error inesperado. Intentalo de nuevo.");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit({
        name,
        locationName,
        type,
        description,
        capacity: capacity ? Number(capacity) : null,
        active,
      });
    } catch (error) {
      const { fieldErrors, formError } = processFormError(error as AppError);
      setFieldErrors(fieldErrors);
      setFormError(formError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {feedback ? <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} /> : null}

        {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
            {fieldErrors.name ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.name}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Ubicacion</span>
            <select
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            >
              {locations.filter((item) => item !== "Todas las ubicaciones").map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {fieldErrors.locationName ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.locationName}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Tipo de equipo</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ResourceCardItem["type"])}
              disabled={mode === "edit"}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            >
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="TABLE">TABLE</option>
              <option value="ROOM">ROOM</option>
              <option value="EQUIPMENT">EQUIPMENT</option>
            </select>
            {mode === "edit" ? (
              <span className="mt-1 block text-xs text-primary-light">El tipo se define al crear y no se puede cambiar.</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-primary-dark">Capacidad</span>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              min={1}
              className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            />
            {fieldErrors.capacity ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.capacity}</span> : null}
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Descripcion</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-primary-dark">
          <input checked={active} onChange={(e) => setActive(e.target.checked)} type="checkbox" />
          Equipo activo
        </label>

        {mode === "edit" && resourceId ? (
          <div className="rounded-xl border border-neutral-dark bg-white p-4">
            <h3 className="text-base font-semibold text-primary">Google Calendar</h3>

            {resourceCalendarStatusQuery.isLoading ? (
              <p className="mt-2 text-sm text-primary-light">Verificando estado del calendario...</p>
            ) : calendarConnected ? (
              <p className="mt-2 text-sm font-medium text-green-700">✅ Calendario sincronizado</p>
            ) : (
              <div className="mt-2 space-y-3">
                <div>
                  <p className="text-sm text-primary">- Sin calendario asignado</p>

                  {!canProvisionGoogleCalendar ? (
                    <p className="mt-1 text-sm text-primary-light">
                      Los turnos de este equipo no se sincronizan con Google Calendar.
                    </p>
                  ) : calendarAuthStatusQuery.isLoading ? (
                    <p className="mt-1 text-sm text-primary-light">Verificando conexión de Google del tenant...</p>
                  ) : calendarAuthStatusQuery.isError ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-primary-light">
                        No pudimos verificar la conexión de Google en este momento.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void calendarAuthStatusQuery.refetch();
                        }}
                        disabled={calendarAuthStatusQuery.isFetching}
                      >
                        <RefreshCw className="mr-2 size-4" />
                        Reintentar verificación
                      </Button>
                    </div>
                  ) : calendarAuthStatusQuery.data?.status === "ACTIVE" ? (
                    <>
                      <p className="mt-1 text-sm text-primary-light">
                        Los turnos de este equipo no se sincronizan con Google Calendar.
                      </p>
                      <Button
                        type="button"
                        className="mt-3"
                        onClick={() => provisionCalendarMutation.mutate()}
                        disabled={provisionCalendarMutation.isPending}
                      >
                        {provisionCalendarMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Creando calendario...
                          </>
                        ) : (
                          "Crear calendario"
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-primary-light">
                        Conectá tu cuenta de Google desde Configuración para habilitar la sincronización.
                      </p>
                      <a
                        href="/configuracion?tab=integraciones"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-secondary-light"
                      >
                        <Link2 className="size-4" />
                        Ir a Configuración
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

type TransferResourceModalProps = {
  resource: ResourceCardItem;
  locations: string[];
  onClose: () => void;
  onSubmit: (payload: { locationName: string; clearSchedule: boolean }) => Promise<void>;
};

export function TransferResourceModal({ resource, locations, onClose, onSubmit }: TransferResourceModalProps) {
  const availableLocations = useMemo(
    () => locations.filter((item) => item !== "Todas las ubicaciones" && item !== resource.locationName),
    [locations, resource.locationName],
  );
  const [locationName, setLocationName] = useState(availableLocations[0] ?? "");
  const [clearSchedule, setClearSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ locationName, clearSchedule });
    } catch (e) {
      const { formError } = processFormError(e as AppError);
      setError(formError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title={`Transferir ${resource.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-primary-light">Sede actual: {resource.locationName}</p>

        <label className="block">
          <span className="mb-1 block text-sm text-primary-dark">Nueva ubicacion</span>
          <select
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          >
            {availableLocations.length === 0 ? <option value="">Sin ubicaciones disponibles</option> : null}
            {availableLocations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-secondary-light bg-secondary/10 p-3 text-sm text-secondary-dark">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4" />
            <p>
              Si activas <strong>clearSchedule</strong>, se asume cancelacion de turnos futuros antes de mover el equipo.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-primary-dark">
          <input checked={clearSchedule} onChange={(e) => setClearSchedule(e.target.checked)} type="checkbox" />
          clearSchedule (operacion riesgosa)
        </label>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting || !locationName}>
            {isSubmitting ? "Transfiriendo..." : "Transferir"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

type ManageServicesModalProps = {
  resource: ResourceCardItem;
  catalog: ResourceServiceCatalogItem[];
  onClose: () => void;
  onSubmit: (selectedServiceIds: string[]) => Promise<void>;
};

export function ManageServicesModal({ resource, catalog, onClose, onSubmit }: ManageServicesModalProps) {
  const [selected, setSelected] = useState<string[]>(resource.serviceIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleService(serviceId: string) {
    setSelected((prev) =>
      prev.includes(serviceId)
        ? prev.filter((item) => item !== serviceId)
        : [...prev, serviceId],
    );
  }

  async function handleSave() {
    setIsSubmitting(true);
    await onSubmit(selected);
    setIsSubmitting(false);
  }

  return (
    <ModalShell title={`Servicios de ${resource.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {catalog.map((service) => (
            <label key={service.id} className="flex items-center gap-2 rounded-md border border-neutral-dark px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(service.id)}
                onChange={() => toggleService(service.id)}
              />
              {service.name}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar servicios"}</Button>
        </div>
      </div>
    </ModalShell>
  );
}
