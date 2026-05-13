import type { MembershipScheduleMode } from "@/features/memberships/membership-types";

export type TenantSubscriptionCapabilities = {
  tierAllows: boolean;
  anyPlanConfigured: boolean;
  activeSubscriptionPlans: number;
  scheduleModesAvailable: MembershipScheduleMode[];
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
  recommended?: {
    subscriptionsMode: MembershipScheduleMode | null;
    showSubscriptionsUI: boolean;
  } | null;
};
