import type { BookingCardItem, BookingStatus } from "@/features/agenda/agenda-service";
import { DayCalendarView } from "@/features/agenda/components/day-calendar-view";
import { MonthCalendarView } from "@/features/agenda/components/month-calendar-view";
import { WeekCalendarView } from "@/features/agenda/components/week-calendar-view";
import type { ViewMode, WeekDay } from "@/features/agenda/utils/calendar-date";

type AgendaCalendarRendererProps = {
  viewMode: ViewMode;
  currentDate: Date;
  weekDays: WeekDay[];
  bookings: BookingCardItem[];
  businessName: string;
  timezone: string;
  onStatusChange: (id: string, status: BookingStatus) => void;
  onDelete: (id: string) => void;
};

export function AgendaCalendarRenderer({
  viewMode,
  currentDate,
  weekDays,
  bookings,
  businessName,
  timezone,
  onStatusChange,
  onDelete,
}: AgendaCalendarRendererProps) {
  if (viewMode === "day") {
    return (
      <DayCalendarView
        currentDate={currentDate}
        bookings={bookings}
        businessName={businessName}
        timezone={timezone}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    );
  }

  if (viewMode === "month") {
    return <MonthCalendarView currentDate={currentDate} bookings={bookings} />;
  }

  return (
    <WeekCalendarView
      weekDays={weekDays}
      bookings={bookings}
      businessName={businessName}
      timezone={timezone}
      onStatusChange={onStatusChange}
      onDelete={onDelete}
    />
  );
}