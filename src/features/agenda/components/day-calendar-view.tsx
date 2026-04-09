import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import type { BookingCardItem, BookingStatus } from "@/features/agenda/agenda-service";
import { BookingCard } from "@/features/agenda/components/booking-card";
import { formatDateParam } from "@/features/agenda/utils/calendar-date";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageCard } from "@/shared/ui/page-card";

type DayCalendarViewProps = {
  currentDate: Date;
  bookings: BookingCardItem[];
  businessName: string;
  timezone: string;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
};

export function DayCalendarView({
  currentDate,
  bookings,
  businessName,
  timezone,
  onStatusChange,
  onDelete,
}: DayCalendarViewProps) {
  const dayKey = formatDateParam(currentDate);
  const dayBookings = useMemo(
    () => bookings
      .filter((booking) => formatDateParam(new Date(booking.startTime)) === dayKey)
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()),
    [bookings, dayKey],
  );

  return (
    <PageCard className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-dark pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Vista diaria</p>
          <p className="text-sm text-primary-light">{dayBookings.length} turno(s) en la fecha seleccionada</p>
        </div>
      </div>

      {dayBookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin turnos para este día"
          description="Probá con otra fecha o ampliá los filtros para ver más actividad."
        />
      ) : (
        <div className="space-y-3">
          {dayBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              businessName={businessName}
              timezone={timezone}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </PageCard>
  );
}