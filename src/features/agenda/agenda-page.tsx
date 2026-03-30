import { useState, useMemo, useEffect, type FormEvent } from "react";
import { Plus, ChevronLeft, ChevronRight, MapPin, Users, CalendarDays } from "lucide-react";
import { useMutation, useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-international-phone/style.css";

import type { AppError } from "@/core/errors/app-error";
import { useCalendarBookingsQuery, useLocationsQuery } from "@/features/agenda/use-agenda-query";
import {
  updateBookingStatus,
  deleteBooking,
  toAgendaFriendlyMessage,
  getStatusLabel,
  getStatusTone,
  getValidStatusTransitions,
  fetchLocationResources,
  type BookingCardItem,
  type BookingStatus,
} from "@/features/agenda/agenda-service";
import {
  createBooking,
  fetchBookingServicesCatalog,
  getBookingErrorMessage,
  type CreateBookingInput,
} from "@/features/bookings/bookings-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { SidePanel } from "@/shared/ui/side-panel";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";

type ViewMode = "week" | "day" | "month";

type WeekDay = {
  date: Date;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
};

function getWeekDays(baseDate: Date): WeekDay[] {
  const days: WeekDay[] = [];
  const startOfWeek = new Date(baseDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);

    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);
    const isToday = dayDate.getTime() === today.getTime();

    days.push({
      date: day,
      dayLabel: new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(day),
      dateLabel: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(day),
      isToday,
    });
  }

  return days;
}

function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type BookingCardProps = {
  booking: BookingCardItem;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
};

function BookingCard({ booking, onStatusChange, onDelete }: BookingCardProps) {
  const [showActions, setShowActions] = useState(false);
  const validTransitions = getValidStatusTransitions(booking.status).filter(
    (status) => status !== "CANCELLED",
  );
  const tone = getStatusTone(booking.status);
  const accentByTone: Record<typeof tone, string> = {
    success: "border-l-4 border-l-green-500",
    warning: "border-l-4 border-l-amber-500",
    neutral: "border-l-4 border-l-slate-400",
    danger: "border-l-4 border-l-red-500",
  };
  const dotByTone: Record<typeof tone, string> = {
    success: "bg-green-600",
    warning: "bg-amber-500",
    neutral: "bg-slate-500",
    danger: "bg-red-600",
  };

  return (
    <div
      className={`group relative mb-2 cursor-pointer rounded-lg border border-neutral-dark bg-white p-2 shadow-sm transition-all hover:shadow-md ${accentByTone[tone]}`}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-primary">
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral px-1.5 py-0.5 text-[10px] font-medium text-primary-light">
            <span className={`size-1.5 rounded-full ${dotByTone[tone]}`} aria-hidden="true" />
            {getStatusLabel(booking.status)}
          </span>
        </div>
        <p className="truncate text-xs font-medium text-primary" title={booking.clientName}>
          {booking.clientName}
        </p>
        <p className="truncate text-xs text-primary-light" title={booking.serviceName}>
          {booking.serviceName}
        </p>
        <p className="truncate text-[11px] text-primary-light" title={booking.resourceName}>
          Prof.: {booking.resourceName}
        </p>
        {booking.notes && (
          <p className="line-clamp-2 text-[11px] text-primary-light" title={booking.notes}>
            Nota: {booking.notes}
          </p>
        )}
      </div>

      {showActions && validTransitions.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-neutral-dark pt-2">
          {validTransitions.map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(booking.id, status);
                setShowActions(false);
              }}
              className="block w-full rounded px-2 py-1 text-left text-xs text-primary-light hover:bg-neutral"
            >
              {getStatusLabel(status)}
            </button>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("¿Estás seguro que querés cancelar este turno?")) {
                onDelete(booking.id);
              }
              setShowActions(false);
            }}
            className="block w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Cancelar turno
          </button>
        </div>
      )}
    </div>
  );
}

type AgendaCreateBookingFormProps = {
  initialLocationId?: string;
  onClose: () => void;
  onCreated: () => void;
};

function AgendaCreateBookingForm({ initialLocationId, onClose, onCreated }: AgendaCreateBookingFormProps) {
  const queryClient = useQueryClient();

  const [locationId, setLocationId] = useState(initialLocationId ?? "");
  const [resourceId, setResourceId] = useState("");
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

  const locationsQuery = useLocationsQuery();

  const resourcesQuery = useQuery({
    queryKey: ["agenda", "resources", locationId],
    queryFn: () => fetchLocationResources(locationId),
    enabled: !!locationId,
    staleTime: 60_000,
  });

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
    if (!locationId) {
      validationErrors.locationId = "Debes seleccionar un local.";
    }
    if (!clientPhone || clientPhone === "+595" || !isValidPhoneNumber(clientPhone)) {
      validationErrors.clientPhone = "Ingresa un telefono valido.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    createMutation.mutate({
      resourceId,
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
  const resources = resourcesQuery.data?.filter((resource) => resource.active) ?? [];
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
              setLocationId(value);
              setResourceId("");
            }}
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
          <Select value={resourceId} onValueChange={setResourceId} disabled={!locationId}>
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
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [showNewBookingPanel, setShowNewBookingPanel] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const locationsQuery = useLocationsQuery();

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

  const hasResourcesError = resourcesByLocationQueries.some((query) => query.isError);
  const isResourcesLoading = resourcesByLocationQueries.some((query) => query.isLoading);

  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  // Calcular rango de fechas del calendario visible (semana completa)
  const calendarDateRange = useMemo(() => {
    if (weekDays.length === 0) {
      return { startDate: "", endDate: "" };
    }
    const startDate = formatDateParam(weekDays[0].date);
    const endDate = formatDateParam(weekDays[weekDays.length - 1].date);
    return { startDate, endDate };
  }, [weekDays]);

  // Query de calendario: solo se ejecuta si hay recursos seleccionados
  const calendarBookingsQuery = useCalendarBookingsQuery({
    resourceIds: selectedResources,
    startDate: calendarDateRange.startDate,
    endDate: calendarDateRange.endDate,
    statuses: ["PENDING", "CONFIRMED"],
  });

  const bookings = calendarBookingsQuery.data ?? [];

  // Limpiar recursos seleccionados cuando cambian las locaciones
  useEffect(() => {
    setSelectedResources([]);
  }, [selectedLocations]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Estado del turno actualizado correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAgendaFriendlyMessage(appError) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Turno cancelado exitosamente." });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      setFeedback({ tone: "error", message: toAgendaFriendlyMessage(appError) });
    },
  });

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
    );
  };

  const handleResourceToggle = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId]
    );
  };

  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingCardItem[]> = {};
    weekDays.forEach((day) => {
      const key = formatDateParam(day.date);
      map[key] = [];
    });

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.startTime);
      const key = formatDateParam(bookingDate);
      if (map[key]) {
        map[key].push(booking);
      }
    });

    // Sort bookings by start time
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return map;
  }, [weekDays, bookings]);

  const errorMessage = calendarBookingsQuery.isError
    ? toAgendaFriendlyMessage(calendarBookingsQuery.error as unknown as AppError)
    : null;

  return (
    <div className="space-y-4">
      {/* Header - Date controls and view mode */}
      <PageCard className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePreviousWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleToday}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={handleNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-sm font-semibold text-primary">
            {new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(currentWeek)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-dark bg-white" role="tablist" aria-label="Vista de calendario">
            <button
              onClick={() => setViewMode("week")}
              role="tab"
              aria-selected={viewMode === "week"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-primary text-white"
                  : "text-primary-light hover:bg-neutral"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("day")}
              role="tab"
              aria-selected={viewMode === "day"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "day"
                  ? "bg-primary text-white"
                  : "text-primary-light hover:bg-neutral"
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode("month")}
              role="tab"
              aria-selected={viewMode === "month"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "month"
                  ? "bg-primary text-white"
                  : "text-primary-light hover:bg-neutral"
              }`}
            >
              Mes
            </button>
          </div>

          <Button size="sm" onClick={() => setShowNewBookingPanel(true)}>
            <Plus className="mr-1 size-4" />
            Nuevo Turno
          </Button>
        </div>
      </PageCard>

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
                    className="size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
                  />
                  <span className="text-sm text-primary">{location.name}</span>
                </label>
              ))}
            </div>
          </PageCard>

          {/* Resources list */}
          <PageCard>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Users className="size-4" />
              Recursos
            </h3>
            {isResourcesLoading && selectedLocations.length > 0 && <LoadingState message="Cargando recursos..." />}
            {hasResourcesError && (
              <ErrorState
                title="No se pudieron cargar recursos"
                message="Reintentá luego de ajustar la seleccion de locales."
              />
            )}
            {resources.length === 0 && !isResourcesLoading && !hasResourcesError && (
              <EmptyState
                icon={Users}
                title="Sin recursos"
                description={
                  selectedLocations.length === 0
                    ? "Seleccioná un local para ver recursos."
                    : "No hay recursos activos en la selección actual."
                }
              />
            )}
            <div className="space-y-1">
              {resources.map((resource) => (
                <label key={resource.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(resource.id)}
                    onChange={() => handleResourceToggle(resource.id)}
                    className="size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
                  />
                  <span className="text-sm text-primary">{resource.name}</span>
                </label>
              ))}
            </div>
          </PageCard>

          {/* Status legend */}
          <PageCard>
            <h3 className="mb-3 text-sm font-semibold text-primary">Estados</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusChip tone="warning" label="Pendiente" />
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone="success" label="Confirmado" />
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone="success" label="Completado" />
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone="danger" label="No asistió" />
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone="neutral" label="Cancelado" />
              </div>
            </div>
          </PageCard>
        </aside>

        {/* Main calendar board */}
        <div>
          {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

          {errorMessage && (
            <ErrorState
              title="No se pudo cargar la agenda"
              message={errorMessage}
              onRetry={() => void calendarBookingsQuery.refetch()}
            />
          )}

          {calendarBookingsQuery.isLoading && <LoadingState message="Cargando agenda..." />}

          {selectedResources.length === 0 && !calendarBookingsQuery.isLoading && (
            <EmptyState
              icon={Users}
              title="Seleccioná recursos para ver turnos"
              description="Elegí uno o más recursos desde el panel lateral para visualizar los turnos del calendario."
            />
          )}

          {!calendarBookingsQuery.isLoading && selectedResources.length > 0 && viewMode === "week" && (
            <PageCard className="overflow-x-auto">
              <div className="min-w-[1120px]">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayKey = formatDateParam(day.date);
                    const dayBookings = bookingsByDay[dayKey] ?? [];

                    return (
                      <div
                        key={dayKey}
                        className={`border-r border-neutral-dark last:border-r-0 ${
                          day.isToday ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="sticky top-0 border-b border-neutral-dark bg-neutral-light p-2 text-center">
                          <p className="text-xs font-semibold uppercase text-primary-light">
                            {day.dayLabel}
                          </p>
                          <p
                            className={`text-sm font-bold ${
                              day.isToday ? "text-primary" : "text-primary-light"
                            }`}
                          >
                            {day.dateLabel}
                          </p>
                        </div>
                        <div className="p-2 min-h-[400px]">
                          {dayBookings.length === 0 ? (
                            <p className="text-center text-xs text-primary-light">Sin turnos</p>
                          ) : (
                            dayBookings.map((booking) => (
                              <BookingCard
                                key={booking.id}
                                booking={booking}
                                onStatusChange={(id, status) =>
                                  updateStatusMutation.mutate({ id, status })
                                }
                                onDelete={(id) => deleteMutation.mutate(id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PageCard>
          )}

          {!calendarBookingsQuery.isLoading && selectedResources.length > 0 && (viewMode === "day" || viewMode === "month") && (
            <EmptyState
              icon={CalendarDays}
              title="Vista en preparación"
              description={`La vista de ${viewMode === "day" ? "día" : "mes"} estará disponible en próximos slices.`}
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
          initialLocationId={selectedLocations.length === 1 ? selectedLocations[0] : undefined}
          onClose={() => setShowNewBookingPanel(false)}
          onCreated={() => {
            setFeedback({ tone: "success", message: "Turno creado correctamente." });
          }}
        />
      </SidePanel>
    </div>
  );
}
