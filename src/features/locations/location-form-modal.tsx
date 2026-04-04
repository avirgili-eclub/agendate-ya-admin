import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import type { AppError } from "@/core/errors/app-error";
import {
  processLocationFormError,
  toLocationsFriendlyMessage,
  type LocationBusinessHoursInput,
  type LocationItem,
  type LocationUpsertInput,
} from "@/features/locations/locations-service";
import { Button } from "@/shared/ui/button";
import { PhoneField } from "@/shared/ui/phone-field";

const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TIMEZONE_OPTIONS = [
  { value: "America/Asuncion", label: "America/Asuncion (UTC-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Argentina/Buenos_Aires (UTC-3)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (UTC-3)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-4/-3)" },
  { value: "America/Montevideo", label: "America/Montevideo (UTC-3)" },
  { value: "UTC", label: "UTC (UTC+0)" },
  { value: "Etc/GMT", label: "Etc/GMT (GMT+0)" },
];

type BusinessHoursDayState = {
  enabled: boolean;
  intervals: Array<{
    startTime: string;
    endTime: string;
  }>;
};

function getDefaultWeeklyState(): BusinessHoursDayState[] {
  return Array.from({ length: 7 }, () => ({
    enabled: false,
    intervals: [{ startTime: "09:00", endTime: "18:00" }],
  }));
}

function mapInitialBusinessHours(location?: LocationItem): {
  timezone: string;
  weekly: BusinessHoursDayState[];
} {
  const timezone = location?.businessHours?.timezone ?? "America/Asuncion";
  const weekly = getDefaultWeeklyState();

  for (const day of location?.businessHours?.weekly ?? []) {
    const dayIndex = day.dayOfWeek;
    if (dayIndex < 0 || dayIndex > 6) {
      continue;
    }

    const normalizedIntervals = Array.isArray(day.intervals)
      ? day.intervals
          .filter(
            (interval): interval is { startTime: string; endTime: string } =>
              typeof interval?.startTime === "string" && typeof interval?.endTime === "string",
          )
          .map((interval) => ({
            startTime: interval.startTime,
            endTime: interval.endTime,
          }))
      : [];

    if (normalizedIntervals.length === 0) {
      continue;
    }

    weekly[dayIndex] = {
      enabled: true,
      intervals: normalizedIntervals,
    };
  }

  return { timezone, weekly };
}

function buildBusinessHoursPayload(
  timezone: string,
  weekly: BusinessHoursDayState[],
): LocationBusinessHoursInput {
  return {
    timezone: timezone.trim() || "America/Asuncion",
    weekly: weekly.map((day, dayOfWeek) => ({
      dayOfWeek,
      intervals: day.enabled ? day.intervals : [],
    })),
  };
}

type LocationFormModalProps = {
  mode: "create" | "edit";
  initialLocation?: LocationItem;
  isOpen: boolean;
  isLoading: boolean;
  error: AppError | null;
  onClose: () => void;
  onSubmit: (input: LocationUpsertInput) => Promise<void>;
};

export function LocationFormModal({
  mode,
  initialLocation,
  isOpen,
  isLoading,
  error,
  onClose,
  onSubmit,
}: LocationFormModalProps) {
  const [name, setName] = useState(initialLocation?.name ?? "");
  const [address, setAddress] = useState(initialLocation?.address ?? "");
  const [phone, setPhone] = useState(initialLocation?.phone ?? "+595");
  const [imageUrl, setImageUrl] = useState(initialLocation?.imageUrl ?? "");
  const [timezone, setTimezone] = useState(initialLocation?.businessHours?.timezone ?? "America/Asuncion");
  const [weeklyBusinessHours, setWeeklyBusinessHours] = useState<BusinessHoursDayState[]>(
    mapInitialBusinessHours(initialLocation).weekly,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const copyToWeekdays = () => {
    setWeeklyBusinessHours((prev) => {
      const source = prev[0]?.enabled
        ? prev[0]
        : prev.slice(0, 5).find((day) => day.enabled) ?? {
            enabled: true,
            intervals: [{ startTime: "09:00", endTime: "18:00" }],
          };

      const clonedIntervals = source.intervals.map((interval) => ({ ...interval }));

      return prev.map((day, index) => {
        if (index < 5) {
          return {
            enabled: true,
            intervals: clonedIntervals.map((interval) => ({ ...interval })),
          };
        }
        return day;
      });
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(initialLocation?.name ?? "");
    setAddress(initialLocation?.address ?? "");
    setPhone(initialLocation?.phone ?? "+595");
    setImageUrl(initialLocation?.imageUrl ?? "");
    const initialHours = mapInitialBusinessHours(initialLocation);
    setTimezone(initialHours.timezone);
    setWeeklyBusinessHours(initialHours.weekly);
    setFieldErrors({});
    setFormError(null);
  }, [isOpen, initialLocation]);

  useEffect(() => {
    if (!error) {
      return;
    }

    setFormError(toLocationsFriendlyMessage(error));
  }, [error]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    for (const [index, day] of weeklyBusinessHours.entries()) {
      if (!day.enabled) {
        continue;
      }

      if (!Array.isArray(day.intervals) || day.intervals.length === 0) {
        setFieldErrors({ [`businessHours.${index}`]: "Debes agregar al menos un intervalo para este día." });
        setFormError("Revisa el horario de atención. Hay días habilitados sin intervalos.");
        return;
      }

      const sortedIntervals = [...day.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let intervalIndex = 0; intervalIndex < sortedIntervals.length; intervalIndex += 1) {
        const interval = sortedIntervals[intervalIndex];
        if (!interval.startTime || !interval.endTime || interval.startTime >= interval.endTime) {
          setFieldErrors({ [`businessHours.${index}`]: "Horario inválido para este día." });
          setFormError("Revisa el horario de atención. La hora de inicio debe ser menor a la hora de fin.");
          return;
        }

        const next = sortedIntervals[intervalIndex + 1];
        if (next && interval.endTime > next.startTime) {
          setFieldErrors({ [`businessHours.${index}`]: "Los intervalos no pueden superponerse." });
          setFormError("Revisa el horario de atención. Hay intervalos superpuestos.");
          return;
        }
      }

      if (day.intervals.some((interval) => !interval.startTime || !interval.endTime || interval.startTime >= interval.endTime)) {
        setFieldErrors({ [`businessHours.${index}`]: "Horario inválido para este día." });
        setFormError("Revisa el horario de atención. La hora de inicio debe ser menor a la hora de fin.");
        return;
      }
    }

    try {
      await onSubmit({
        name,
        address,
        phone: phone === "+595" ? "" : phone,
        imageUrl,
        businessHours: buildBusinessHoursPayload(timezone, weeklyBusinessHours),
      });
    } catch (submitError) {
      const appError = submitError as AppError;
      const parsed = processLocationFormError(appError);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.formError);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {formError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
      )}

      <div>
        <label htmlFor="location-name" className="block text-sm font-medium text-primary">
          Nombre de la sede <span className="text-red-600">*</span>
        </label>
        <input
          id="location-name"
          type="text"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className={`mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none ring-primary-light focus:ring-2 ${
            fieldErrors.name ? "border-red-500" : "border-neutral-dark"
          }`}
          placeholder="Sede Centro"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="location-address" className="block text-sm font-medium text-primary">
          Dirección
        </label>
        <input
          id="location-address"
          type="text"
          value={address}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Av. Principal 1234"
        />
      </div>

      <div>
        <label htmlFor="location-phone" className="block text-sm font-medium text-primary">
          Teléfono
        </label>
        <PhoneField
          id="location-phone"
          name="phone"
          value={phone}
          onChange={setPhone}
          error={fieldErrors.phone}
          className="mt-1"
        />
        {fieldErrors.phone && <p className="mt-1 text-xs text-red-700">{fieldErrors.phone}</p>}
      </div>

      <div>
        <label htmlFor="location-image" className="block text-sm font-medium text-primary">
          URL de imagen
        </label>
        <input
          id="location-image"
          type="url"
          value={imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="https://..."
        />
        {fieldErrors.imageUrl && (
          <p className="mt-1 text-xs text-red-700">{fieldErrors.imageUrl}</p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-dark p-4">
        <h3 className="text-sm font-semibold text-primary">Horario de atención</h3>
        <p className="mt-1 text-xs text-primary-light">
          Configura el horario semanal de esta sede.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyToWeekdays}>
            Copiar a días hábiles
          </Button>
        </div>

        <div className="mt-3">
          <label htmlFor="location-timezone" className="block text-xs font-medium text-primary">
            Zona horaria
          </label>
          <select
            id="location-timezone"
            value={timezone}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTimezone(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          >
            {!TIMEZONE_OPTIONS.some((option) => option.value === timezone) && (
              <option value={timezone}>{`${timezone} (actual)`}</option>
            )}
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {DAY_LABELS.map((label, index) => {
            const day = weeklyBusinessHours[index];
            return (
              <div key={label} className="rounded-md border border-neutral-dark/70 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-w-[120px] items-center gap-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setWeeklyBusinessHours((prev) =>
                          prev.map((entry, dayIndex) =>
                            dayIndex === index
                              ? {
                                  ...entry,
                                  enabled: e.target.checked,
                                  intervals:
                                    entry.intervals.length > 0
                                      ? entry.intervals
                                      : [{ startTime: "09:00", endTime: "18:00" }],
                                }
                              : entry,
                          ),
                        );
                      }}
                      className="size-4 rounded border-neutral-dark"
                    />
                    {label}
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!day.enabled}
                    onClick={() => {
                      setWeeklyBusinessHours((prev) =>
                        prev.map((entry, dayIndex) =>
                          dayIndex === index
                            ? {
                                ...entry,
                                intervals: [...entry.intervals, { startTime: "09:00", endTime: "18:00" }],
                              }
                            : entry,
                        ),
                      );
                    }}
                  >
                    + Intervalo
                  </Button>
                </div>

                {day.enabled && (
                  <div className="mt-2 space-y-2">
                    {day.intervals.map((interval, intervalIndex) => (
                      <div key={`${label}-${intervalIndex}`} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={interval.startTime}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const nextValue = e.target.value;
                            setWeeklyBusinessHours((prev) =>
                              prev.map((entry, dayIndex) =>
                                dayIndex === index
                                  ? {
                                      ...entry,
                                      intervals: entry.intervals.map((entryInterval, entryIntervalIndex) =>
                                        entryIntervalIndex === intervalIndex
                                          ? { ...entryInterval, startTime: nextValue }
                                          : entryInterval,
                                      ),
                                    }
                                  : entry,
                              ),
                            );
                          }}
                          className="h-9 rounded-md border border-neutral-dark px-2 text-sm"
                        />

                        <span className="text-xs text-primary-light">a</span>

                        <input
                          type="time"
                          value={interval.endTime}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const nextValue = e.target.value;
                            setWeeklyBusinessHours((prev) =>
                              prev.map((entry, dayIndex) =>
                                dayIndex === index
                                  ? {
                                      ...entry,
                                      intervals: entry.intervals.map((entryInterval, entryIntervalIndex) =>
                                        entryIntervalIndex === intervalIndex
                                          ? { ...entryInterval, endTime: nextValue }
                                          : entryInterval,
                                      ),
                                    }
                                  : entry,
                              ),
                            );
                          }}
                          className="h-9 rounded-md border border-neutral-dark px-2 text-sm"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={day.intervals.length === 1}
                          onClick={() => {
                            setWeeklyBusinessHours((prev) =>
                              prev.map((entry, dayIndex) =>
                                dayIndex === index
                                  ? {
                                      ...entry,
                                      intervals:
                                        entry.intervals.length === 1
                                          ? entry.intervals
                                          : entry.intervals.filter((_, idx) => idx !== intervalIndex),
                                    }
                                  : entry,
                              ),
                            );
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {fieldErrors[`businessHours.${index}`] && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors[`businessHours.${index}`]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : mode === "create" ? "Crear Sede" : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}