import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import type { ViewMode } from "@/features/agenda/utils/calendar-date";

type ViewModeSelectorProps = {
  label: string;
  viewMode: ViewMode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: ViewMode) => void;
  onCreateBooking: () => void;
  disableCreateBooking?: boolean;
};

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
  { value: "month", label: "Mes" },
];

export function ViewModeSelector({
  label,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onCreateBooking,
  disableCreateBooking,
}: ViewModeSelectorProps) {
  return (
    <PageCard className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={onPrevious}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onToday}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={onNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="min-w-0 truncate text-sm font-semibold text-primary sm:text-base">{label}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
        <div
          className="grid grid-cols-3 rounded-lg border border-neutral-dark bg-white"
          role="tablist"
          aria-label="Vista de calendario"
        >
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              role="tab"
              aria-selected={viewMode === option.value}
              className={`px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                viewMode === option.value
                  ? "bg-primary text-white"
                  : "text-primary-light hover:bg-neutral"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={onCreateBooking} disabled={disableCreateBooking}>
          <Plus className="mr-1 size-4" />
          Nuevo Turno
        </Button>
      </div>
    </PageCard>
  );
}