export type ViewMode = "week" | "day" | "month";

export type WeekDay = {
  date: Date;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
};

export type MonthGridDay = {
  date: Date;
  dayLabel: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const weekdayShortFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short" });
const dayMonthShortFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const monthLongFormatter = new Intl.DateTimeFormat("es-AR", { month: "long" });
const longDayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const bookingDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function capitalizeLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function startOfIsoWeek(baseDate: Date): Date {
  const startOfWeek = new Date(baseDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

function endOfIsoWeek(baseDate: Date): Date {
  const endOfWeek = startOfIsoWeek(baseDate);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function getWeekDays(baseDate: Date): WeekDay[] {
  const days: WeekDay[] = [];
  const startOfWeek = startOfIsoWeek(baseDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);

    days.push({
      date: day,
      dayLabel: weekdayShortFormatter.format(day),
      dateLabel: dayMonthShortFormatter.format(day),
      isToday: isSameCalendarDay(day, today),
    });
  }

  return days;
}

export function getMonthGridDays(baseDate: Date): MonthGridDay[] {
  const firstDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const lastDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const startDate = startOfIsoWeek(firstDayOfMonth);
  const endDate = endOfIsoWeek(lastDayOfMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: MonthGridDay[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    days.push({
      date: new Date(cursor),
      dayLabel: weekdayShortFormatter.format(cursor),
      dayNumber: String(cursor.getDate()).padStart(2, "0"),
      isCurrentMonth: cursor.getMonth() === baseDate.getMonth(),
      isToday: isSameCalendarDay(cursor, today),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function formatTime(isoString: string): string {
  return timeFormatter.format(new Date(isoString));
}

export function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthName(date: Date): string {
  return capitalizeLabel(monthLongFormatter.format(date));
}

export function formatWeekRangeLabel(weekDays: WeekDay[]): string {
  if (weekDays.length === 0) {
    return "";
  }

  const firstDay = weekDays[0].date;
  const lastDay = weekDays[weekDays.length - 1].date;
  const startDayNum = String(firstDay.getDate()).padStart(2, "0");
  const endDayNum = String(lastDay.getDate()).padStart(2, "0");

  if (firstDay.getFullYear() !== lastDay.getFullYear()) {
    return `${startDayNum} ${formatMonthName(firstDay)}, ${firstDay.getFullYear()} - ${endDayNum} ${formatMonthName(lastDay)}, ${lastDay.getFullYear()}`;
  }

  if (firstDay.getMonth() !== lastDay.getMonth()) {
    return `${startDayNum} ${formatMonthName(firstDay)} - ${endDayNum} ${formatMonthName(lastDay)}, ${lastDay.getFullYear()}`;
  }

  return `${startDayNum} - ${endDayNum} ${formatMonthName(lastDay)}, ${lastDay.getFullYear()}`;
}

export function formatDayLabel(date: Date): string {
  return capitalizeLabel(longDayFormatter.format(date));
}

export function formatMonthLabel(date: Date): string {
  return `${formatMonthName(date)} ${date.getFullYear()}`;
}

export function formatBookingDateTime(isoString: string, timezone: string): string {
  if (!bookingDateTimeFormatterCache.has(timezone)) {
    bookingDateTimeFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("es-PY", {
        timeZone: timezone,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
  }

  return bookingDateTimeFormatterCache.get(timezone)!.format(new Date(isoString));
}

export function getDateRangeForView(viewMode: ViewMode, currentDate: Date): {
  startDate: string;
  endDate: string;
} {
  if (viewMode === "day") {
    const day = formatDateParam(currentDate);
    return { startDate: day, endDate: day };
  }

  if (viewMode === "month") {
    const monthGridDays = getMonthGridDays(currentDate);
    return {
      startDate: formatDateParam(monthGridDays[0].date),
      endDate: formatDateParam(monthGridDays[monthGridDays.length - 1].date),
    };
  }

  const weekDays = getWeekDays(currentDate);
  return {
    startDate: formatDateParam(weekDays[0].date),
    endDate: formatDateParam(weekDays[weekDays.length - 1].date),
  };
}

export function moveDateByView(baseDate: Date, viewMode: ViewMode, direction: -1 | 1): Date {
  const nextDate = new Date(baseDate);

  if (viewMode === "day") {
    nextDate.setDate(nextDate.getDate() + direction);
    return nextDate;
  }

  if (viewMode === "month") {
    nextDate.setMonth(nextDate.getMonth() + direction);
    return nextDate;
  }

  nextDate.setDate(nextDate.getDate() + direction * 7);
  return nextDate;
}