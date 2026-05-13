import { useState, type FormEvent } from "react";

import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipScheduleMode,
} from "@/features/memberships/membership-types";
import { Button } from "@/shared/ui/button";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type MembershipPlanFormPanelProps = {
  plan?: MembershipPlan | null;
  defaultScheduleMode?: MembershipScheduleMode | null;
  serverError?: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: MembershipPlanInput) => void;
};

type FieldErrors = Partial<Record<"name" | "classesPerPeriod" | "price" | "currency", string>>;

const SCHEDULE_MODE_HELP: Record<MembershipScheduleMode, string> = {
  FIXED: "Clientes con horarios fijos semanales. Ideal para pilates, yoga o clases con cupo.",
  FLEXIBLE: "Clientes reservan cuando quieren y consumen clases del periodo.",
  BOTH: "Permite planes mixtos. Usalo si el negocio realmente opera con ambos esquemas.",
};

function getInitialScheduleMode(
  plan: MembershipPlan | null | undefined,
  defaultScheduleMode: MembershipScheduleMode | null | undefined,
): MembershipScheduleMode {
  return plan?.scheduleMode ?? defaultScheduleMode ?? "FLEXIBLE";
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function MembershipPlanFormPanel({
  plan,
  defaultScheduleMode,
  serverError,
  isSubmitting,
  onCancel,
  onSubmit,
}: MembershipPlanFormPanelProps) {
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [scheduleMode, setScheduleMode] = useState<MembershipScheduleMode>(() =>
    getInitialScheduleMode(plan, defaultScheduleMode),
  );
  const [classesPerPeriod, setClassesPerPeriod] = useState(
    plan?.classesPerPeriod == null ? "" : String(plan.classesPerPeriod),
  );
  const [price, setPrice] = useState(plan?.price ?? "");
  const [currency, setCurrency] = useState(plan?.currency ?? "PYG");
  const [active, setActive] = useState(plan?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    const normalizedName = name.trim();
    const normalizedCurrency = currency.trim().toUpperCase();
    const parsedPrice = parseNumber(price);
    const parsedClasses =
      classesPerPeriod.trim().length === 0 ? null : Math.trunc(parseNumber(classesPerPeriod));

    if (!normalizedName) {
      nextErrors.name = "El nombre es obligatorio.";
    }

    if (price.trim().length === 0) {
      nextErrors.price = "El precio es obligatorio.";
    } else if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      nextErrors.price = "El precio debe ser mayor o igual a 0.";
    }

    if (parsedClasses !== null && (!Number.isFinite(parsedClasses) || parsedClasses < 1)) {
      nextErrors.classesPerPeriod = "Usa un numero entero mayor a 0 o deja el campo vacio.";
    }

    if (!normalizedCurrency) {
      nextErrors.currency = "La moneda es obligatoria.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit({
      name: normalizedName,
      description: description.trim() || undefined,
      durationPeriod: "MONTHLY",
      classesPerPeriod: parsedClasses,
      price: parsedPrice,
      currency: normalizedCurrency,
      active,
      scheduleMode,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {serverError ? <FeedbackBanner tone="error" message={serverError} /> : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Nombre *</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Mensual 8 clases"
        />
        {fieldErrors.name ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.name}</span> : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Descripcion</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Plan mensual para clases recurrentes"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Modalidad *</span>
          <Select value={scheduleMode} onValueChange={(value) => setScheduleMode(value as MembershipScheduleMode)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar modalidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fija</SelectItem>
              <SelectItem value="FLEXIBLE">Flexible</SelectItem>
              <SelectItem value="BOTH">Mixta</SelectItem>
            </SelectContent>
          </Select>
          <span className="mt-1 block text-xs text-primary-light">{SCHEDULE_MODE_HELP[scheduleMode]}</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Periodo</span>
          <input
            type="text"
            value="Mensual"
            disabled
            className="h-11 w-full rounded-md border border-neutral-dark bg-neutral px-3 text-sm text-primary-light"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Clases por mes</span>
          <input
            type="number"
            min={1}
            step={1}
            value={classesPerPeriod}
            onChange={(event) => setClassesPerPeriod(event.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="8"
          />
          {fieldErrors.classesPerPeriod ? (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.classesPerPeriod}</span>
          ) : (
            <span className="mt-1 block text-xs text-primary-light">Vacio = ilimitado.</span>
          )}
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Precio *</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
            placeholder="150000"
          />
          {fieldErrors.price ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.price}</span> : null}
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Moneda *</span>
          <input
            type="text"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm uppercase outline-none ring-primary-light focus:ring-2"
            placeholder="PYG"
          />
          {fieldErrors.currency ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.currency}</span> : null}
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-neutral-dark bg-neutral/50 p-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="mt-1 size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
        />
        <span>
          <span className="block text-sm font-medium text-primary-dark">Plan activo</span>
          <span className="mt-1 block text-xs text-primary-light">Los planes activos pueden usarse para nuevas suscripciones.</span>
        </span>
      </label>

      <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : plan ? "Guardar cambios" : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}
