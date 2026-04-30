import type { ElementType } from "react";
import { Leaf, Zap, Star } from "lucide-react";
import type { PlanId } from "@/features/auth/types/signup-plans";
import { cn } from "@/shared/lib/cn";

const PLAN_LABELS: Record<PlanId, { name: string; description: string }> = {
  FREE: { name: "Gratis", description: "Empezá sin costo. Ideal para probar la plataforma." },
  BASIC: { name: "Básico", description: "Funcionalidades esenciales para tu negocio." },
  PRO: { name: "Profesional", description: "Todo lo del Básico + reportes avanzados y más." },
};

const PLAN_ICONS: Record<PlanId, ElementType> = {
  FREE: Leaf,
  BASIC: Zap,
  PRO: Star,
};

export interface PlanSelectorCardProps {
  plans: PlanId[];
  selectedPlan: PlanId | null;
  trialEligiblePlans: PlanId[];
  trialDays: number;
  onChange: (plan: PlanId) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PlanSelectorCard({
  plans,
  selectedPlan,
  trialEligiblePlans,
  trialDays,
  onChange,
  isLoading = false,
  error = null,
}: PlanSelectorCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-neutral-dark bg-neutral-dark/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((planId) => {
        const label = PLAN_LABELS[planId];
        const Icon = PLAN_ICONS[planId];
        const isSelected = selectedPlan === planId;
        const hasTrialBadge = trialEligiblePlans.includes(planId);

        return (
          <label
            key={planId}
            className={cn(
              "relative flex cursor-pointer flex-col rounded-xl border-2 bg-white p-5 transition-all",
              "hover:border-secondary/60 hover:shadow-sm",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2",
              isSelected
                ? "border-secondary shadow-md ring-2 ring-secondary/20"
                : "border-neutral-dark",
            )}
          >
            {/* Hidden radio input for a11y grouping */}
            <input
              type="radio"
              name="selected-plan"
              value={planId}
              checked={isSelected}
              onChange={() => onChange(planId)}
              className="sr-only"
            />

            {/* Header row: icon + trial badge */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isSelected ? "bg-secondary text-white" : "bg-neutral text-secondary",
                )}
              >
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              {hasTrialBadge && (
                <span className="whitespace-nowrap rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                  {trialDays} días gratis
                </span>
              )}
            </div>

            {/* Plan name */}
            <span
              className={cn(
                "text-base font-semibold",
                isSelected ? "text-secondary" : "text-primary",
              )}
            >
              {label.name}
            </span>

            {/* Description */}
            <p className="mt-1 text-sm leading-snug text-primary-light/80">
              {label.description}
            </p>
          </label>
        );
      })}
    </div>
  );
}
