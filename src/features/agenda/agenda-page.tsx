import { useState, useMemo, useEffect, type FormEvent } from "react";
import { MapPin, Users, CalendarDays, ListChecks } from "lucide-react";
import { useMutation, useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-international-phone/style.css";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import { useCalendarBookingsQuery, useLocationsQuery } from "@/features/agenda/use-agenda-query";
import { AgendaCalendarRenderer } from "@/features/agenda/components/agenda-calendar-renderer";
import { ViewModeSelector } from "@/features/agenda/components/view-mode-selector";
import {
  updateBookingStatus,
  deleteBooking,
  toAgendaFriendlyMessage,
  getStatusLabel,
  getStatusTone,
  fetchLocationResources,
  fetchResourceById,
  type BookingStatus,
  type ResourceItem,
} from "@/features/agenda/agenda-service";
import {
  formatDayLabel,
  formatMonthLabel,
  formatWeekRangeLabel,
  getDateRangeForView,
  getWeekDays,
  moveDateByView,
  type ViewMode,
} from "@/features/agenda/utils/calendar-date";
import {
  createBooking,
  fetchBookingServicesCatalog,
  getBookingErrorMessage,
  type CreateBookingInput,
} from "@/features/bookings/bookings-service";
import { fetchTenantInfo } from "@/features/tenant/tenant-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { SidePanel } from "@/shared/ui/side-panel";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";
import { useFeedback } from "@/shared/notifications/use-feedback";

const STATUS_FILTER_OPTIONS: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

type AgendaCreateBookingFormProps = {
  initialLocationId?: string;
  onClose: () => void;
  onCreated: () => void;
};

function AgendaCreateBookingForm({ initialLocationId, onClose, onCreated }: AgendaCreateBookingFormProps) {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const isProfessional = currentRole === "PROFESSIONAL";
  const currentResourceId = session.user?.resourceId ?? "";
  const professionalResourceName = session.user?.fullName?.trim() || "Mi recurso";

  const [locationId, setLocationId] = useState(initialLocationId ?? "");
  const [resourceId, setResourceId] = useState(isProfessional ? currentResourceId : "");
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+595");
  const [clientEmail, setClientEmail] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialLocationId) {
      setLocationId(initialLocationId);
    }
  }, [initialLocationId]);

  useEffect(() => {
    if (!isProfessional || !currentResourceId) {
      return;
    }

    setResourceId((previous) => (previous === currentResourceId ? previous : currentResourceId));
  }, [isProfessional, currentResourceId]);

  const locationsQuery = useLocationsQuery();

  const resourcesQuery = useQuery({
    queryKey: ["agenda", "resources", locationId],
    queryFn: () => fetchLocationResources(locationId),
    enabled: !!locationId && !isProfessional,
    staleTime: 60_000,
  });

  const professionalResourceQuery = useQuery({
    queryKey: ["agenda", "resource", currentResourceId],
    queryFn: () => fetchResourceById(currentResourceId),
    enabled: isProfessional && !!currentResourceId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isProfessional) {
      return;
    }

    const professionalLocationId = professionalResourceQuery.data?.locationId;
    if (!professionalLocationId) {
      return;
    }

    setLocationId((previous) =>
      previous === professionalLocationId ? previous : professionalLocationId,
    );
  }, [isProfessional, professionalResourceQuery.data?.locationId]);

  const servicesQuery = useQuery({
    queryKey: ["bookings", "services"],
    queryFn: fetchBookingServicesCatalog,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
      setFormError(null);
      setFieldErrors({});
      onCreated();
      onClose();
    },
    onError: (error: AppError) => {
      setFieldErrors(extractFieldErrors(error));
      setFormError(getBookingErrorMessage(error));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validationErrors: Record<string, string> = {};
    if (!isProfessional && !locationId) {
      validationErrors.locationId = "Debes seleccionar un local.";
    }
    if (isProfessional && !currentResourceId) {
      validationErrors.resourceId = "Tu usuario no tiene recurso asignado.";
    }
    if (!clientPhone || clientPhone === "+595" || !isValidPhoneNumber(clientPhone)) {
      validationErrors.clientPhone = "Ingresa un telefono valido.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    createMutation.mutate({
      resourceId: isProfessional ? currentResourceId : resourceId,
      serviceId,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      date,
      startTime,
      notes: notes || undefined,
    });
  }

  const locations = locationsQuery.data?.filter((location) => location.active) ?? [];
  const resources: ResourceItem[] = isProfessional
    ? currentResourceId
      ? [
          {
            id: currentResourceId,
            locationId: professionalResourceQuery.data?.locationId ?? "",
            name: professionalResourceQuery.data?.name ?? professionalResourceName,
            type: professionalResourceQuery.data?.type ?? "PROFESSIONAL",
            active: true,
          },
        ]
      : []
    : resourcesQuery.data?.filter((resource) => resource.active) ?? [];
  const services = servicesQuery.data?.filter((service) => service.active) ?? [];

  return (
    <form className="space-y-4 px-6 py-4" onSubmit={handleSubmit}>
      {formError && (
        <FeedbackBanner tone="error" message={formError} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Nombre del cliente *</span>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="Juan Perez"
          />
          {fieldErrors.clientName && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientName}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Telefono *</span>
          <div className={`register-phone-wrapper ${fieldErrors.clientPhone ? "!border-red-500" : ""}`}>
            <PhoneInput
              defaultCountry="py"
              preferredCountries={["py", "ar", "br", "cl", "uy"]}
              disableDialCodeAndPrefix
              showDisabledDialCodeAndPrefix
              defaultMask="(...) ... - ..."
              placeholder="(981) 123 - 456"
              value={clientPhone}
              onChange={(phone) => setClientPhone(phone)}
              className="register-phone-root"
              inputClassName="register-phone-input"
              inputProps={{
                name: "clientPhone",
                autoComplete: "tel",
              }}
              countrySelectorStyleProps={{
                buttonClassName: "register-phone-country-button",
                flagClassName: "register-phone-flag",
                dropdownArrowClassName: "register-phone-country-arrow",
                dropdownStyleProps: {
                  className: "register-phone-country-dropdown",
                  listItemClassName: "register-phone-country-item",
                  listItemSelectedClassName: "register-phone-country-item-selected",
                  listItemFocusedClassName: "register-phone-country-item-focused",
                },
              }}
            />
          </div>
          {fieldErrors.clientPhone && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientPhone}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Email (opcional)</span>
        <input
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="cliente@ejemplo.com"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Local *</span>
          <Select
            value={locationId}
            onValueChange={(value) => {
              if (isProfessional) {
                return;
              }
              setLocationId(value);
              setResourceId("");
            }}
            disabled={isProfessional}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.locationId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.locationId}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Recurso *</span>
          <Select
            value={resourceId}
            onValueChange={setResourceId}
            disabled={isProfessional || (!locationId && !isProfessional)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar recurso" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.resourceId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.resourceId}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Servicio *</span>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar servicio" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.serviceId && (
          <span className="mt-1 block text-xs text-red-700">{fieldErrors.serviceId}</span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.date && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.date}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Hora de inicio *</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.startTime && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.startTime}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Informacion adicional sobre el turno"
        />
      </label>

      <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear turno"}
        </Button>
      </div>
    </form>
  );
}

export function AgendaPage() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const currentResourceId = session.user?.resourceId;
  const isProfessional = currentRole === "PROFESSIONAL";

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>(
    isProfessional && currentResourceId ? [currentResourceId] : []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<BookingStatus[]>([
    "PENDING",
    "CONFIRMED",
  ]);
  const [showNewBookingPanel, setShowNewBookingPanel] = useState(false);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("booking");

  const locationsQuery = useLocationsQuery();
  const tenantQuery = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
    staleTime: 300_000,
  });

  const resourcesByLocationQueries = useQueries({
    queries: selectedLocations.map((locationId) => ({
      queryKey: ["agenda", "resources", locationId],
      queryFn: () => fetchLocationResources(locationId),
      staleTime: 60_000,
    })),
  });

  const locations = locationsQuery.data ?? [];
  const resources = useMemo(() => {
    const map = new Map<string, { id: string; locationId: string; name: string; active: boolean }>();

    resourcesByLocationQueries.forEach((query) => {
      const items = query.data ?? [];
      items.forEach((resource) => {
        map.set(resource.id, {
          id: resource.id,
          locationId: resource.locationId,
          name: resource.name,
          active: resource.active,
        });
      });
    });

    return Array.from(map.values()).filter((resource) => resource.active);
  }, [resourcesByLocationQueries]);

  const scopedResources = useMemo(() => {
    if (!isProfessional || !currentResourceId) {
      return resources;
    }

    return resources.filter((resource) => resource.id === currentResourceId);
  }, [resources, isProfessional, currentResourceId]);

  const scopedResourceIds =
    isProfessional && currentResourceId ? [currentResourceId] : selectedResources;

  const professionalResource =
    isProfessional && currentResourceId
      ? resources.find((resource) => resource.id === currentResourceId)
      : undefined;

  const hasResourcesError = resourcesByLocationQueries.some((query) => query.isError);
  const isResourcesLoading = resourcesByLocationQueries.some((query) => query.isLoading);
  const businessName = tenantQuery.data?.name ?? "AgendateYA";
  const tenantTimezone = tenantQuery.data?.timezone ?? "America/Asuncion";

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const calendarDateRange = useMemo(
    () => getDateRangeForView(viewMode, currentDate),
    [viewMode, currentDate],
  );

  const calendarBookingsQuery = useCalendarBookingsQuery({
    resourceIds: scopedResourceIds,
    startDate: calendarDateRange.startDate,
    endDate: calendarDateRange.endDate,
    statuses: selectedStatuses,
  });

  const bookings = selectedStatuses.length === 0 ? [] : (calendarBookingsQuery.data ?? []);
  const calendarLabel = useMemo(() => {
    if (viewMode === "day") {
      return formatDayLabel(currentDate);
    }

    if (viewMode === "month") {
      return formatMonthLabel(currentDate);
    }

    return formatWeekRangeLabel(weekDays);
  }, [currentDate, viewMode, weekDays]);

  useEffect(() => {
    if (isProfessional) {
      return;
    }
    setSelectedResources([]);
  }, [selectedLocations, isProfessional]);

  useEffect(() => {
    if (!isProfessional || !currentResourceId || locations.length === 0) {
      return;
    }

    setSelectedLocations((previous) => {
      const next = locations.map((location) => location.id);
      if (previous.length === next.length && previous.every((id, index) => id === next[index])) {
        return previous;
      }
      return next;
    });
  }, [isProfessional, currentResourceId, locations]);

  useEffect(() => {
    if (!isProfessional || !currentResourceId) {
      return;
    }

    setSelectedResources((previous) => {
      if (previous.length === 1 && previous[0] === currentResourceId) {
        return previous;
      }
      return [currentResourceId];
    });
  }, [isProfessional, currentResourceId]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => {
      showFeedback("success", "Estado del turno actualizado correctamente.");
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toAgendaFriendlyMessage(appError));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      showFeedback("success", "Turno cancelado exitosamente.");
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toAgendaFriendlyMessage(appError));
    },
  });

  const handlePreviousPeriod = () => {
    setCurrentDate((previous) => moveDateByView(previous, viewMode, -1));
  };

  const handleNextPeriod = () => {
    setCurrentDate((previous) => moveDateByView(previous, viewMode, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleLocationToggle = (locationId: string) => {
    if (isProfessional) return; // PROFESSIONAL users cannot change location
    setSelectedLocations((prev) =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
    );
  };

  const handleResourceToggle = (resourceId: string) => {
    if (isProfessional) return; // PROFESSIONAL users cannot change resource
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId]
    );
  };

  const handleStatusToggle = (status: BookingStatus) => {
    setSelectedStatuses((prev) => {
      const next = prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status];

      return STATUS_FILTER_OPTIONS.filter((option) => next.includes(option));
    });
  };

  const handleToggleAllResources = () => {
    if (isProfessional) return;
    
    const visibleResourceIds = scopedResources.map((r) => r.id);
    const allSelected = visibleResourceIds.every((id) => selectedResources.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedResources([]);
    } else {
      // Select all
      setSelectedResources(visibleResourceIds);
    }
  };

  const errorMessage = calendarBookingsQuery.isError
    ? toAgendaFriendlyMessage(calendarBookingsQuery.error as unknown as AppError)
    : null;

  return (
    <div className="space-y-4">
      {/* Error state for PROFESSIONAL without resourceId */}
      {isProfessional && !currentResourceId && (
        <ErrorState
          title="Configuración incompleta"
          message="Tu cuenta no tiene un recurso asignado. Contacta al administrador para resolver este problema."
        />
      )}

      <ViewModeSelector
        label={calendarLabel}
        viewMode={viewMode}
        onPrevious={handlePreviousPeriod}
        onNext={handleNextPeriod}
        onToday={handleToday}
        onViewChange={setViewMode}
        onCreateBooking={() => setShowNewBookingPanel(true)}
        disableCreateBooking={isProfessional && !currentResourceId}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left panel - Filters and legend */}
        <aside className="space-y-4">
          {/* Location filters */}
          <PageCard>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin className="size-4" />
              Locales
            </h3>
            {locationsQuery.isLoading && <LoadingState message="Cargando locales..." />}
            {locationsQuery.isError && (
              <ErrorState
                title="No se pudieron cargar locales"
                message="Reintentá para continuar filtrando la agenda por sede."
                onRetry={() => void locationsQuery.refetch()}
              />
            )}
            {locations.length === 0 && !locationsQuery.isLoading && !locationsQuery.isError && (
              <EmptyState
                icon={MapPin}
                title="Sin locales"
                description="No hay locales disponibles para este tenant."
              />
            )}
            <div className="space-y-2">
              {locations.map((location) => (
                <label key={location.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={() => handleLocationToggle(location.id)}
                    disabled={isProfessional}
                    className="size-4 rounded border-neutral-dark text-primary focus:ring-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${isProfessional ? "text-primary-light" : "text-primary"}`}>
                    {location.name}
                  </span>
                </label>
              ))}
            </div>
          </PageCard>

          {/* Resources list */}
          {!isProfessional && (
            <PageCard>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Users className="size-4" />
                  Equipo
                </h3>
                {scopedResources.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllResources}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-primary-light transition hover:bg-neutral-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
                    title={
                      scopedResources.every((r) => selectedResources.includes(r.id))
                        ? "Deseleccionar todos"
                        : "Seleccionar todos"
                    }
                  >
                    <ListChecks className="size-3.5" />
                    {scopedResources.every((r) => selectedResources.includes(r.id))
                      ? "Ninguno"
                      : "Todos"}
                  </button>
                )}
              </div>
              {isResourcesLoading && selectedLocations.length > 0 && <LoadingState message="Cargando recursos..." />}
              {hasResourcesError && (
                <ErrorState
                  title="No se pudieron cargar recursos"
                  message="Reintentá luego de ajustar la seleccion de locales."
                />
              )}
              {scopedResources.length === 0 && !isResourcesLoading && !hasResourcesError && (
                <EmptyState
                  icon={Users}
                  title="Sin equipo"
                  description={
                    selectedLocations.length === 0
                      ? "Seleccioná un local para ver a los profesionales."
                      : "No hay profesionales activos en la selección actual."
                  }
                />
              )}
              <div className="space-y-1">
                {scopedResources.map((resource) => (
                  <label key={resource.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scopedResourceIds.includes(resource.id)}
                      onChange={() => handleResourceToggle(resource.id)}
                      className="size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
                    />
                    <span className="text-sm text-primary">{resource.name}</span>
                  </label>
                ))}
              </div>
            </PageCard>
          )}

          {/* Status legend */}
          <PageCard>
            <h3 className="mb-3 text-sm font-semibold text-primary">Estados</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTER_OPTIONS.map((status) => {
                const isActive = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusToggle(status)}
                    aria-pressed={isActive}
                    className={`rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light ${
                      isActive ? "" : "opacity-45"
                    }`}
                    title={isActive ? "Quitar del filtro" : "Agregar al filtro"}
                  >
                    <StatusChip tone={getStatusTone(status)} label={getStatusLabel(status)} />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-primary-light">Podés seleccionar múltiples estados.</p>
          </PageCard>
        </aside>

        {/* Main calendar board */}
        <div>
          <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />

          {errorMessage && (
            <ErrorState
              title="No se pudo cargar la agenda"
              message={errorMessage}
              onRetry={() => void calendarBookingsQuery.refetch()}
            />
          )}

          {calendarBookingsQuery.isLoading && <LoadingState message="Cargando agenda..." />}

          {scopedResourceIds.length === 0 && !calendarBookingsQuery.isLoading && (
            <EmptyState
              icon={Users}
              title="Seleccioná recursos para ver turnos"
              description="Elegí uno o más recursos desde el panel lateral para visualizar los turnos del calendario."
            />
          )}

          {scopedResourceIds.length > 0 && selectedStatuses.length === 0 && !calendarBookingsQuery.isLoading && (
            <EmptyState
              icon={CalendarDays}
              title="Seleccioná al menos un estado"
              description="Usá los chips de Estado para filtrar qué turnos querés ver en la agenda."
            />
          )}

          {!calendarBookingsQuery.isLoading && scopedResourceIds.length > 0 && selectedStatuses.length > 0 && (
            <AgendaCalendarRenderer
              viewMode={viewMode}
              currentDate={currentDate}
              weekDays={weekDays}
              bookings={bookings}
              businessName={businessName}
              timezone={tenantTimezone}
              onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>
      </div>

      {/* New booking side panel */}
      <SidePanel
        isOpen={showNewBookingPanel}
        onClose={() => setShowNewBookingPanel(false)}
        title="Nuevo Turno"
      >
        <AgendaCreateBookingForm
          initialLocationId={
            isProfessional
              ? professionalResource?.locationId
              : selectedLocations.length === 1
              ? selectedLocations[0]
              : undefined
          }
          onClose={() => setShowNewBookingPanel(false)}
          onCreated={() => {
            showFeedback("success", "Turno creado correctamente.");
          }}
        />
      </SidePanel>
    </div>
  );
}
