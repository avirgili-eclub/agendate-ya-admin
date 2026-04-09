import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import type { BookingCardItem } from "@/features/agenda/agenda-service";
import { formatDateParam, formatTime, getMonthGridDays } from "@/features/agenda/utils/calendar-date";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageCard } from "@/shared/ui/page-card";

type MonthCalendarViewProps = {
  currentDate: Date;
  bookings: BookingCardItem[];
};

export function MonthCalendarView({ currentDate, bookings }: MonthCalendarViewProps) {
  const monthGridDays = useMemo(() => getMonthGridDays(currentDate), [currentDate]);
  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingCardItem[]> = {};

    monthGridDays.forEach((day) => {
      map[formatDateParam(day.date)] = [];
    });

    bookings.forEach((booking) => {
      const key = formatDateParam(new Date(booking.startTime));
      if (map[key]) {
        map[key].push(booking);
      }
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());
    });

    return map;
  }, [bookings, monthGridDays]);

  const hasAnyBookings = bookings.length > 0;

  return (
    <PageCard className="space-y-4 p-3 sm:p-4">
      {!hasAnyBookings ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin turnos en este período"
          description="No encontramos actividad para el mes visible con los filtros actuales."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {monthGridDays.map((day) => {
            const dayKey = formatDateParam(day.date);
            const dayBookings = bookingsByDay[dayKey] ?? [];
            const previewBookings = dayBookings.slice(0, 3);
            const remainingCount = dayBookings.length - previewBookings.length;

            return (
              <section
                key={dayKey}
                className={`rounded-xl border p-3 ${
                  day.isToday
                    ? "border-primary bg-primary/5"
                    : day.isCurrentMonth
                    ? "border-neutral-dark bg-white"
                    : "border-neutral-dark/70 bg-neutral-light/50"
                }`}
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">
                      {day.dayLabel}
                    </p>
                    <p className={`text-sm font-bold ${day.isToday ? "text-primary" : "text-primary-light"}`}>
                      {day.dayNumber}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral px-2 py-1 text-[11px] font-medium text-primary-light">
                    {dayBookings.length} turno(s)
                  </span>
                </header>

                {previewBookings.length === 0 ? (
                  <p className="text-xs text-primary-light">Sin turnos</p>
                ) : (
                  <div className="space-y-2">
                    {previewBookings.map((booking) => (
                      <div key={booking.id} className="rounded-lg bg-neutral-light px-2 py-1.5 text-xs text-primary-light">
                        <p className="font-semibold text-primary">
                          {formatTime(booking.startTime)} · {booking.clientName}
                        </p>
                        <p className="truncate">{booking.serviceName}</p>
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <p className="text-[11px] font-medium text-primary-light">+{remainingCount} más</p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </PageCard>
  );
}