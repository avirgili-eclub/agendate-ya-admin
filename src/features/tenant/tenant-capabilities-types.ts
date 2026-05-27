import type { MembershipScheduleMode } from "@/features/memberships/membership-types";

export type TenantSubscriptionCapabilities = {
  tierAllows: boolean;
  enabledByTenant: boolean;
  enabled: boolean;
  anyPlanConfigured: boolean;
  activeSubscriptionPlans: number;
  scheduleModesAvailable: MembershipScheduleMode[];
};

export type TenantFeatureCapability = {
  tierAllows?: boolean;
  enabledByTenant?: boolean;
  enabled?: boolean;
  available?: boolean;
};

export type TenantCapabilities = {
  tenantId: string;
  tier: string;
  businessType?: string | null;
  businessSubType?: string | null;
  modes: {
    payPerVisit?: {
      enabled: boolean;
    };
    subscriptions: TenantSubscriptionCapabilities;
  };
  features?: {
    METRICS_DASHBOARD?: TenantFeatureCapability;
    metricsDashboard?: TenantFeatureCapability;
    WHATSAPP?: TenantFeatureCapability;
    whatsapp?: TenantFeatureCapability;
    WHATSAPP_BUSINESS?: TenantFeatureCapability;
    whatsappBusiness?: TenantFeatureCapability;
  } | null;
  modules?: {
    METRICS_DASHBOARD?: TenantFeatureCapability;
    metricsDashboard?: TenantFeatureCapability;
    WHATSAPP?: TenantFeatureCapability;
    whatsapp?: TenantFeatureCapability;
    WHATSAPP_BUSINESS?: TenantFeatureCapability;
    whatsappBusiness?: TenantFeatureCapability;
  } | null;
  recommended?: {
    subscriptionsMode: MembershipScheduleMode | null;
    showSubscriptionsUI: boolean;
  } | null;
};

export function canUseMetricsDashboard(capabilities?: TenantCapabilities | null): boolean {
  return capabilities?.features?.metricsDashboard?.enabled === true;
}

const WHATSAPP_CAPABILITY_KEYS = ["WHATSAPP", "whatsapp", "WHATSAPP_BUSINESS", "whatsappBusiness"] as const;

function isCapabilityEnabled(capability?: TenantFeatureCapability): boolean {
  if (!capability) {
    return false;
  }

  if (capability.enabled === false || capability.available === false) {
    return false;
  }

  if (capability.tierAllows === false || capability.enabledByTenant === false) {
    return false;
  }

  return capability.enabled === true || capability.available === true || capability.tierAllows === true;
}

function findWhatsappCapability(
  source?: Record<string, TenantFeatureCapability | undefined> | null,
): TenantFeatureCapability | undefined {
  return WHATSAPP_CAPABILITY_KEYS.map((key) => source?.[key]).find(Boolean);
}

export function canUseWhatsappBusiness(capabilities?: TenantCapabilities | null): boolean {
  if (!capabilities) {
    return false;
  }

  const featureCapability = findWhatsappCapability(capabilities?.features);
  const moduleCapability = findWhatsappCapability(capabilities?.modules);

  if (featureCapability || moduleCapability) {
    return isCapabilityEnabled(featureCapability) || isCapabilityEnabled(moduleCapability);
  }

  return (capabilities?.tier ?? "").toUpperCase() !== "FREE";
}
