import { useMemo } from "react";

import type { BookingCardItem, BookingStatus } from "@/features/agenda/agenda-service";
import { formatDateParam, type WeekDay } from "@/features/agenda/utils/calendar-date";
import { BookingCard } from "@/features/agenda/components/booking-card";
import { PageCard } from "@/shared/ui/page-card";

type WeekCalendarViewProps = {
  weekDays: WeekDay[];
  bookings: BookingCardItem[];
  businessName: string;
  timezone: string;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
};

export function WeekCalendarView({
  weekDays,
  bookings,
  businessName,
  timezone,
  onStatusChange,
  onDelete,
}: WeekCalendarViewProps) {
  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingCardItem[]> = {};

    weekDays.forEach((day) => {
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
  }, [bookings, weekDays]);

  return (
    <PageCard className="p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {weekDays.map((day) => {
          const dayKey = formatDateParam(day.date);
          const dayBookings = bookingsByDay[dayKey] ?? [];

          return (
            <section
              key={dayKey}
              className={`flex min-h-[14rem] flex-col rounded-xl border border-neutral-dark p-3 md:min-h-[16rem] xl:min-h-[34rem] ${day.isToday ? "bg-primary/5" : "bg-white"}`}
            >
              <header className="mb-3 border-b border-neutral-dark pb-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">
                  {day.dayLabel}
                </p>
                <p className={`text-sm font-bold ${day.isToday ? "text-primary" : "text-primary-light"}`}>
                  {day.dateLabel}
                </p>
              </header>

              <div className="flex flex-1 flex-col justify-start">
                {dayBookings.length === 0 ? (
                  <p className="pt-2 text-center text-xs text-primary-light">Sin turnos</p>
                ) : (
                  dayBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      businessName={businessName}
                      timezone={timezone}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </PageCard>
  );
}