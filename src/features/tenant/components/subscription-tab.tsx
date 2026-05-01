import { CreditCard, Zap, AlertTriangle, CheckCircle, Clock, ArrowUpRight, Users, MapPin, Wrench, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchTenantInfo,
  toTenantFriendlyMessage,
  getTierLabel,
  getSubscriptionStatusLabel,
  normalizeTier,
} from "@/features/tenant/tenant-service";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";

type PlanFeature = {
  label: string;
  included: boolean;
};

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  free: [
    { label: "1 local", included: true },
    { label: "2 recursos/equipos", included: true },
    { label: "1 usuario", included: true },
    { label: "50 turnos por mes", included: true },
    { label: "Branding personalizado", included: false },
    { label: "Notificaciones por email", included: false },
    { label: "Soporte prioritario", included: false },
  ],
  basic: [
    { label: "3 locales", included: true },
    { label: "10 recursos/equipos", included: true },
    { label: "3 usuarios", included: true },
    { label: "200 turnos por mes", included: true },
    { label: "Branding personalizado", included: true },
    { label: "Notificaciones por email", included: false },
    { label: "Soporte prioritario", included: false },
  ],
  professional: [
    { label: "10 locales", included: true },
    { label: "50 recursos/equipos", included: true },
    { label: "10 usuarios", included: true },
    { label: "1000 turnos por mes", included: true },
    { label: "Branding personalizado", included: true },
    { label: "Notificaciones por email", included: true },
    { label: "Soporte prioritario", included: false },
  ],
  enterprise: [
    { label: "Locales ilimitados", included: true },
    { label: "Recursos ilimitados", included: true },
    { label: "Usuarios ilimitados", included: true },
    { label: "Turnos ilimitados", included: true },
    { label: "Branding personalizado", included: true },
    { label: "Notificaciones por email", included: true },
    { label: "Soporte prioritario", included: true },
  ],
};

const PLAN_COLORS: Record<string, string> = {
  free: "from-slate-50 to-slate-100 border-slate-200",
  basic: "from-blue-50 to-indigo-50 border-blue-200",
  professional: "from-violet-50 to-purple-50 border-violet-200",
  enterprise: "from-amber-50 to-orange-50 border-amber-200",
};

const USAGE_METRICS = [
  { key: "locations" as const, label: "Locales", icon: MapPin },
  { key: "resources" as const, label: "Recursos", icon: Wrench },
  { key: "users" as const, label: "Usuarios", icon: Users },
  { key: "bookings" as const, label: "Turnos este mes", icon: CalendarCheck },
];

function UsageBar({
  label,
  current,
  max,
  icon: Icon,
}: {
  label: string;
  current: number;
  max: number;
  icon: typeof MapPin;
}) {
  const pct = max === 0 ? 0 : Math.min(100, (current / max) * 100);
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-primary-light">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span
          className={`font-semibold tabular-nums ${
            isCritical ? "text-red-600" : isWarning ? "text-secondary" : "text-primary"
          }`}
        >
          {current} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-dark">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCritical ? "bg-red-500" : isWarning ? "bg-secondary" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isCritical && (
        <p className="mt-1 text-[10px] font-medium text-red-600">
          Límite casi alcanzado. Considerá actualizar tu plan.
        </p>
      )}
    </div>
  );
}

function getStatusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return <CheckCircle className="size-4 text-success" />;
  if (s === "trialing") return <Clock className="size-4 text-secondary" />;
  if (s === "past_due") return <AlertTriangle className="size-4 text-red-500" />;
  return <AlertTriangle className="size-4 text-primary-light" />;
}

function getTrialDaysLeft(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export function SubscriptionTab() {
  const { data: tenantInfo, isLoading, error } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
  });

  if (isLoading) {
    return (
      <PageCard>
        <div className="text-center text-sm text-primary-light">Cargando suscripción...</div>
      </PageCard>
    );
  }

  if (error) {
    return (
      <PageCard>
        <div className="text-center text-sm text-red-600">
          {toTenantFriendlyMessage(error as unknown as AppError)}
        </div>
      </PageCard>
    );
  }

  if (!tenantInfo) return null;

  const tier = normalizeTier(tenantInfo.subscriptionTier ?? "free");
  const status = (tenantInfo.subscriptionStatus ?? "active").toLowerCase();
  const tierLabel = getTierLabel(tier);
  const statusLabel = getSubscriptionStatusLabel(status);
  const features = PLAN_FEATURES[tier] ?? PLAN_FEATURES.free;
  const planGradient = PLAN_COLORS[tier] ?? PLAN_COLORS.free;
  const trialDaysLeft = getTrialDaysLeft(tenantInfo.subscriptionTrialEndsAt);

  const getStatusTone = (): "success" | "warning" | "neutral" | "danger" => {
    if (status === "active") return "success";
    if (status === "trialing") return "warning";
    if (status === "past_due" || status === "canceled") return "danger";
    return "neutral";
  };

  const hasUsageData = tenantInfo.maxLocations != null;

  return (
    <div className="space-y-5">
      {/* Plan Card */}
      <div className={`rounded-xl border bg-gradient-to-br p-5 ${planGradient}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-light">
                Plan actual
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-primary">{tierLabel}</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              {getStatusIcon(status)}
              <StatusChip label={statusLabel} tone={getStatusTone()} />
            </div>
          </div>
        </div>

        {/* Trial banner */}
        {status === "trialing" && trialDaysLeft !== null && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary-dark">
            <Clock className="size-4 shrink-0" />
            <span>
              {trialDaysLeft === 0
                ? "Tu período de prueba termina hoy."
                : `Tu período de prueba vence en ${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""}.`}
            </span>
          </div>
        )}

        {/* Past due warning */}
        {status === "past_due" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Tu pago está pendiente. Actualizá tu método de pago para evitar interrupciones.</span>
          </div>
        )}

        {/* Features list */}
        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-sm">
              <span
                className={`size-4 shrink-0 rounded-full flex items-center justify-center text-xs ${
                  f.included ? "bg-success/20 text-success-dark" : "bg-neutral-dark text-primary-light"
                }`}
              >
                {f.included ? "✓" : "–"}
              </span>
              <span className={f.included ? "text-primary" : "text-primary-light opacity-60"}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {tier !== "enterprise" && (
          <div className="mt-4 border-t border-current/10 pt-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              onClick={() => window.open("mailto:hola@agendateya.app?subject=Quiero actualizar mi plan", "_blank")}
            >
              <Zap className="size-4" />
              Actualizar plan
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Usage metrics */}
      {hasUsageData && (
        <PageCard>
          <div className="border-b border-neutral-dark pb-4">
            <h3 className="text-base font-semibold text-primary">Uso del Plan</h3>
            <p className="mt-0.5 text-xs text-primary-light">Recursos consumidos en tu plan actual.</p>
          </div>
          <div className="mt-4 space-y-4">
            {USAGE_METRICS.map(({ key, label, icon }) => {
              const currentMap = {
                locations: tenantInfo.currentLocations ?? 0,
                resources: tenantInfo.currentResources ?? 0,
                users: tenantInfo.currentUsers ?? 0,
                bookings: tenantInfo.currentBookingsThisMonth ?? 0,
              };
              const maxMap = {
                locations: tenantInfo.maxLocations ?? 0,
                resources: tenantInfo.maxResources ?? 0,
                users: tenantInfo.maxUsers ?? 0,
                bookings: tenantInfo.maxBookingsPerMonth ?? 0,
              };
              return (
                <UsageBar
                  key={key}
                  label={label}
                  current={currentMap[key]}
                  max={maxMap[key]}
                  icon={icon}
                />
              );
            })}
          </div>
        </PageCard>
      )}

      {!hasUsageData && (
        <PageCard>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CreditCard className="size-8 text-primary-light opacity-40" />
            <p className="text-sm text-primary-light">
              La información de uso del plan no está disponible todavía.
            </p>
          </div>
        </PageCard>
      )}
    </div>
  );
}
