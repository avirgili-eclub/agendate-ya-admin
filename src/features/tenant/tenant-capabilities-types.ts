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
  } | null;
  modules?: {
    METRICS_DASHBOARD?: TenantFeatureCapability;
    metricsDashboard?: TenantFeatureCapability;
  } | null;
  recommended?: {
    subscriptionsMode: MembershipScheduleMode | null;
    showSubscriptionsUI: boolean;
  } | null;
};

function isCapabilityEnabled(capability?: TenantFeatureCapability): boolean {
  if (!capability) {
    return false;
  }

  if (typeof capability.enabled === "boolean") {
    return capability.enabled;
  }

  if (typeof capability.available === "boolean") {
    return capability.available;
  }

  if (typeof capability.tierAllows === "boolean") {
    return capability.tierAllows && (capability.enabledByTenant ?? true);
  }

  return false;
}

export function canUseMetricsDashboard(capabilities?: TenantCapabilities | null): boolean {
  const feature =
    capabilities?.features?.METRICS_DASHBOARD ??
    capabilities?.features?.metricsDashboard ??
    capabilities?.modules?.METRICS_DASHBOARD ??
    capabilities?.modules?.metricsDashboard;

  return isCapabilityEnabled(feature);
}
