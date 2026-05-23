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

export function canUseMetricsDashboard(capabilities?: TenantCapabilities | null): boolean {
  return capabilities?.features?.METRICS_DASHBOARD?.enabled === true;
}
