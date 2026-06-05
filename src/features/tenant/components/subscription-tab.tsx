import {
  CreditCard,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Users,
  MapPin,
  Wrench,
  CalendarCheck,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchTenantInfo,
  toTenantFriendlyMessage,
  getTierLabel,
  getSubscriptionStatusLabel,
  normalizeTier,
} from "@/features/tenant/tenant-service";
import {
  fetchSubscriptionStatus,
  type BillingInterval,
  type UsageMetric,
} from "@/features/tenant/subscription-service";
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
  { key: "clients" as const, label: "Clientes", icon: Users },
  { key: "professionals" as const, label: "Profesionales / recursos", icon: Wrench },
  { key: "locations" as const, label: "Locales", icon: MapPin },
  { key: "bookingsCreated" as const, label: "Turnos este mes", icon: CalendarCheck },
  { key: "whatsAppMessagesSent" as const, label: "Recordatorios WhatsApp", icon: MessageCircle },
  { key: "whatsAppActiveOutboundNumbers" as const, label: "Numeros WhatsApp activos", icon: MessageCircle },
  { key: "voiceCalls" as const, label: "Llamadas de voz", icon: Phone, unavailable: true },
  { key: "voiceMinutes" as const, label: "Minutos de voz", icon: Clock, unavailable: true },
  { key: "users" as const, label: "Usuarios staff", icon: Users },
  { key: "services" as const, label: "Servicios", icon: Wrench },
];

const USAGE_LABELS = Object.fromEntries(
  USAGE_METRICS.map((metric) => [metric.key, metric.label]),
) as Record<string, string>;

const WARNING_KEY_LABELS: Record<string, string> = {
  locations_at_limit: "Locales",
  locations_near_limit: "Locales",
  users_at_limit: "Usuarios staff",
  users_near_limit: "Usuarios staff",
  professionals_at_limit: "Profesionales / recursos",
  professionals_near_limit: "Profesionales / recursos",
  whatsAppMessagesSent_at_limit: "Recordatorios WhatsApp",
  whatsAppMessagesSent_near_limit: "Recordatorios WhatsApp",
  whatsAppActiveOutboundNumbers_at_limit: "Numeros WhatsApp activos",
  whatsAppActiveOutboundNumbers_near_limit: "Numeros WhatsApp activos",
};

const pygFormatter = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

function formatUsage(metric: UsageMetric) {
  if (metric.limit.unlimited) {
    return `${metric.used} / Ilimitado`;
  }

  return `${metric.used} / ${metric.limit.value ?? 0}`;
}

function usagePercent(metric: UsageMetric) {
  if (metric.limit.unlimited || !metric.limit.value) return null;
  return Math.min(100, (metric.used / metric.limit.value) * 100);
}

function getUsageTone(metric: UsageMetric, pct: number | null): "success" | "warning" | "danger" {
  if (metric.overLimit) return "danger";
  if (pct !== null && pct >= 90) return "danger";
  if (pct !== null && pct >= 75) return "warning";
  return "success";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(Number(year), Number(month) - 1, Number(day)),
    );
  }

  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

function getBillingIntervalLabel(interval: BillingInterval | null | undefined) {
  if (interval === "MONTHLY") return "Mensual";
  if (interval === "ANNUAL") return "Anual";
  return "Sin suscripcion";
}

function getCurrentPriceLabel(interval: BillingInterval | null | undefined) {
  if (interval === "MONTHLY") return "Precio mensual";
  if (interval === "ANNUAL") return "Precio anual";
  return "Precio actual";
}

function formatPrice(value: number, interval: BillingInterval | null | undefined) {
  if (interval === "NONE" || value === 0) return "Sin costo";
  return pygFormatter.format(value);
}

function formatWarningMessage({
  key,
  used,
  limit,
  severity,
}: {
  key: string;
  used: number;
  limit: UsageMetric["limit"];
  severity: string;
}) {
  const label = USAGE_LABELS[key] ?? WARNING_KEY_LABELS[key] ?? key;
  const usageLabel = limit.unlimited ? `${used} / Ilimitado` : `${used} / ${limit.value ?? 0}`;
  if (severity === "CRITICAL") return `${label} alcanzo el limite (${usageLabel}).`;
  return `${label} esta cerca del limite (${usageLabel}).`;
}

function UsageBar({
  label,
  metric,
  icon: Icon,
  unavailable = false,
}: {
  label: string;
  metric: UsageMetric;
  icon: typeof MapPin;
  unavailable?: boolean;
}) {
  if (unavailable) {
    return (
      <div className="rounded-lg border border-neutral-dark bg-neutral/70 p-3 opacity-70">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-primary-light">
            <Icon className="size-3.5" />
            {label}
          </span>
          <StatusChip label="Proximamente" tone="neutral" />
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-dark">
          <div className="h-full w-0 rounded-full bg-neutral-dark" />
        </div>
        <p className="mt-2 text-xs text-primary-light">
          Funcionalidad en preparacion.
        </p>
      </div>
    );
  }

  const pct = usagePercent(metric);
  const tone = getUsageTone(metric, pct);
  const progressColor =
    tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-secondary" : "bg-primary";
  const valueColor =
    tone === "danger" ? "text-red-600" : tone === "warning" ? "text-secondary" : "text-primary";

  return (
    <div className="rounded-lg border border-neutral-dark bg-white/70 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-primary-light">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${valueColor}`}>{formatUsage(metric)}</span>
      </div>
      {pct === null ? (
        <p className="mt-2 text-xs text-primary-light">Sin limite del plan para este recurso.</p>
      ) : (
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-dark">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-primary-light">
        {metric.remaining !== null && !metric.limit.unlimited ? <span>Disponibles: {metric.remaining}</span> : null}
        {!metric.reliable ? <StatusChip label="Estimado" tone="neutral" /> : null}
        {metric.overLimit ? <StatusChip label="Excedido" tone="danger" /> : null}
        {pct !== null && !metric.overLimit && pct >= 75 ? (
          <StatusChip label={pct >= 90 ? "Limite cercano" : "Uso alto"} tone="warning" />
        ) : null}
      </div>
      {metric.overLimit ? (
        <p className="mt-2 text-[11px] font-medium text-red-600">
          Este recurso supero el limite efectivo del plan.
        </p>
      ) : null}
    </div>
  );
}

function BillingInfoGrid({
  status,
  billingInterval,
  nextPaymentAt,
  currentPeriodEnd,
  usagePeriodStart,
  usagePeriodEnd,
  currentPricePYG,
}: {
  status: string;
  billingInterval: BillingInterval | null;
  nextPaymentAt: string | null;
  currentPeriodEnd: string | null;
  usagePeriodStart: string;
  usagePeriodEnd: string;
  currentPricePYG: number;
}) {
  const effectiveInterval = billingInterval;
  const items = [
    { label: "Facturacion", value: getSubscriptionStatusLabel(status) },
    { label: "Ciclo", value: getBillingIntervalLabel(effectiveInterval) },
    { label: getCurrentPriceLabel(effectiveInterval), value: formatPrice(currentPricePYG, effectiveInterval) },
    { label: "Proximo pago", value: formatDate(nextPaymentAt) },
    { label: "Fin del periodo", value: formatDate(currentPeriodEnd) },
    {
      label: "Periodo de uso",
      value: `${formatDate(usagePeriodStart)} - ${formatDate(usagePeriodEnd)}`,
      className: "col-span-2 lg:col-span-1",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border border-neutral-dark bg-white/70 px-3 py-2 ${item.className ?? ""}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-light">{item.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsageUnavailableCard({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <PageCard>
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CreditCard className="size-8 text-primary-light opacity-40" />
        <p className="text-sm text-primary-light">
          {isLoading ? "Cargando informacion de uso del plan..." : "La informacion de uso del plan no esta disponible todavia."}
        </p>
        {error ? (
          <>
            <p className="max-w-lg text-xs text-red-600">{toTenantFriendlyMessage(error as AppError)}</p>
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
              onClick={onRetry}
            >
              Reintentar
            </button>
          </>
        ) : null}
      </div>
    </PageCard>
  );
}

function UsageSection({ status }: { status: Awaited<ReturnType<typeof fetchSubscriptionStatus>> }) {
  const usageItems = USAGE_METRICS.map(({ key, label, icon, unavailable }) => ({
    key,
    label,
    icon,
    unavailable: unavailable ?? false,
    metric: status.usage[key],
  })).filter((item) => item.metric);

  const warnings = status.warnings ?? [];
  const hasCriticalWarning = warnings.some((warning) => warning.severity === "CRITICAL");

  return (
    <PageCard>
      <div className="border-b border-neutral-dark pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-primary">Uso del Plan</h3>
            <p className="mt-0.5 text-xs text-primary-light">
              Recursos consumidos contra los limites efectivos que devuelve el backend.
            </p>
          </div>
          <StatusChip label={getTierLabel(status.plan.tier)} tone="neutral" className="self-start" />
        </div>
        <div className="mt-4">
          <BillingInfoGrid
            status={status.billing.status}
            billingInterval={status.billing.billingInterval ?? status.plan.billingInterval}
            nextPaymentAt={status.billing.nextPaymentAt}
            currentPeriodEnd={status.billing.currentPeriodEnd}
            usagePeriodStart={status.usagePeriod.start}
            usagePeriodEnd={status.usagePeriod.end}
            currentPricePYG={status.plan.currentPricePYG}
          />
        </div>
      </div>

      {status.overages.length > 0 ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Hay limites sobrepasados.</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {status.overages.map((overage) => (
                  <li key={overage.key}>{overage.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      {status.overages.length === 0 && warnings.length > 0 ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            hasCriticalWarning
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-secondary/30 bg-secondary/10 text-secondary-dark"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Algunos recursos necesitan atencion.</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {warnings.map((warning) => (
                  <li key={`${warning.key}-${warning.severity}`}>{formatWarningMessage(warning)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {usageItems.map(({ key, label, icon, metric, unavailable }) => (
          <UsageBar key={key} label={label} metric={metric} icon={icon} unavailable={unavailable} />
        ))}
      </div>
    </PageCard>
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
  const subscriptionStatusQuery = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchSubscriptionStatus,
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
      {subscriptionStatusQuery.data ? (
        <UsageSection status={subscriptionStatusQuery.data} />
      ) : (
        <UsageUnavailableCard
          isLoading={subscriptionStatusQuery.isLoading}
          error={subscriptionStatusQuery.error}
          onRetry={() => {
            void subscriptionStatusQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
