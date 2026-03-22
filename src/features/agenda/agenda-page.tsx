import { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, MapPin, Users, CalendarDays } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { useBookingsQuery, useLocationsQuery, useLocationResourcesQuery } from "@/features/agenda/use-agenda-query";
import {
  updateBookingStatus,
  deleteBooking,
  toAgendaFriendlyMessage,
  getStatusLabel,
  getStatusTone,
  getValidStatusTransitions,
  type BookingCardItem,
  type BookingStatus,
} from "@/features/agenda/agenda-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { SidePanel } from "@/shared/ui/side-panel";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";

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

type BookingCardProps = {
  booking: BookingCardItem;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
};

function BookingCard({ booking, onStatusChange, onDelete }: BookingCardProps) {
  const [showActions, setShowActions] = useState(false);
  const validTransitions = getValidStatusTransitions(booking.status);

  return (
    <div
      className="group relative mb-2 cursor-pointer rounded-lg border border-neutral-dark bg-white p-2 shadow-sm transition-all hover:shadow-md"
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary truncate">{booking.clientName}</p>
          <p className="text-xs text-primary-light truncate">{booking.serviceName}</p>
          <p className="text-xs text-primary-light">
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          </p>
        </div>
        <StatusChip label={getStatusLabel(booking.status)} tone={getStatusTone(booking.status)} />
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
              Cambiar a: {getStatusLabel(status)}
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

export function AgendaPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showNewBookingPanel, setShowNewBookingPanel] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const bookingsQuery = useBookingsQuery({ page: 0, pageSize: 200 });
  const locationsQuery = useLocationsQuery();

  // Get all resources for selected locations
  const firstLocationId = selectedLocations.length > 0 ? selectedLocations[0] : null;
  const resourcesQuery = useLocationResourcesQuery(firstLocationId);

  const locations = locationsQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];
  const bookings = bookingsQuery.data?.data ?? [];

  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Estado del turno actualizado correctamente." });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
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

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (selectedLocations.length > 0 && !selectedLocations.includes(booking.locationId)) {
        return false;
      }
      return true;
    });
  }, [bookings, selectedLocations]);

  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingCardItem[]> = {};
    weekDays.forEach((day) => {
      const key = day.date.toISOString().split("T")[0];
      map[key] = [];
    });

    filteredBookings.forEach((booking) => {
      const bookingDate = new Date(booking.startTime);
      const key = bookingDate.toISOString().split("T")[0];
      if (map[key]) {
        map[key].push(booking);
      }
    });

    // Sort bookings by start time
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return map;
  }, [weekDays, filteredBookings]);

  const errorMessage = bookingsQuery.isError
    ? toAgendaFriendlyMessage(bookingsQuery.error as unknown as AppError)
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
            {resourcesQuery.isLoading && <LoadingState message="Cargando recursos..." />}
            {resources.length === 0 && !resourcesQuery.isLoading && (
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
                <div key={resource.id} className="text-sm text-primary-light">
                  {resource.name}
                </div>
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
            <ErrorState title="No se pudo cargar la agenda" message={errorMessage} onRetry={() => void bookingsQuery.refetch()} />
          )}

          {bookingsQuery.isLoading && <LoadingState message="Cargando agenda..." />}

          {!bookingsQuery.isLoading && viewMode === "week" && (
            <PageCard className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayKey = day.date.toISOString().split("T")[0];
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

          {!bookingsQuery.isLoading && (viewMode === "day" || viewMode === "month") && (
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
        <div className="space-y-4">
          <p className="text-sm text-primary-light">
            Formulario de creación de turnos - Se implementará en Slice 7 (Bookings CRUD Details).
          </p>
          <p className="text-sm text-primary-light">
            Este panel está listo para recibir el formulario completo con validación de conflictos,
            selección de cliente, servicio y recurso según la especificación de la API.
          </p>
          <Button onClick={() => setShowNewBookingPanel(false)} variant="outline" className="w-full">
            Cerrar
          </Button>
        </div>
      </SidePanel>
    </div>
  );
}
