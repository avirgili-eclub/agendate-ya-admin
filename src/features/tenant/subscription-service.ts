import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";

export type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
export type BillingInterval = "MONTHLY" | "ANNUAL" | "NONE";

export type SubscriptionFeature =
  | "EMAIL_REMINDERS"
  | "PUSH_NOTIFICATIONS"
  | "BOOKING_WEBSITE"
  | "REPORTS"
  | "PAYMENTS"
  | "GOOGLE_REVIEWS"
  | "WHATSAPP"
  | "COMMISSION_REPORTS"
  | "SALES_REPORTS"
  | "GOOGLE_CALENDAR"
  | "GOOGLE_MEET"
  | "API_ACCESS"
  | "AVAILABILITY_RULES"
  | "WHATSAPP_BOT"
  | "GOOGLE_CALENDAR_SYNC"
  | "CLIENT_SUBSCRIPTIONS"
  | "METRICS_DASHBOARD";

export type LimitValue = {
  value: number | null;
  unlimited: boolean;
};

export type UsageMetric = {
  used: number;
  limit: LimitValue;
  remaining: number | null;
  overLimit: boolean;
  source: "live" | "meter" | string;
  reliable: boolean;
};

export type UsageWarning = {
  key: string;
  severity: "WARNING" | "CRITICAL" | string;
  used: number;
  limit: LimitValue;
  percent: number;
  message: string;
};

export type SubscriptionStatus = {
  tenantId: string;
  plan: {
    tier: SubscriptionTier;
    displayName: string;
    currency: "PYG" | string;
    billingInterval: BillingInterval;
    currentPricePYG: number;
    monthlyPricePYG: number;
    annualPricePYG: number;
    features: SubscriptionFeature[];
  };
  billing: {
    status: string;
    billingInterval: BillingInterval | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    nextPaymentAt: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    trialEndsAt: string | null;
    billingPortalAvailable: boolean;
  };
  usagePeriod: {
    start: string;
    end: string;
  };
  limits: {
    clients: LimitValue;
    users: LimitValue;
    services: LimitValue;
    professionals: LimitValue;
    bookingsPerMonth: LimitValue;
    locations: LimitValue;
    whatsAppMessagesPerMonth: LimitValue;
    voiceCallsPerMonth: LimitValue;
    voiceMinutesPerMonth: LimitValue;
    apiRatePerMinute: LimitValue;
  };
  usage: {
    clients: UsageMetric;
    users: UsageMetric;
    services: UsageMetric;
    professionals: UsageMetric;
    locations: UsageMetric;
    whatsAppActiveOutboundNumbers: UsageMetric;
    bookingsCreated: UsageMetric;
    whatsAppMessagesSent: UsageMetric;
    voiceCalls: UsageMetric;
    voiceMinutes: UsageMetric;
    apiCalls: UsageMetric;
  };
  actions: {
    canAddProfessional: boolean;
    canAddLocation: boolean;
    canCreateBooking: boolean;
    canSendWhatsApp: boolean;
    canUseVoice: boolean;
    canUseApi: boolean;
  };
  overages: Array<{
    key: string;
    used: number;
    limit: LimitValue;
    overBy: number;
    message: string;
  }>;
  warnings: UsageWarning[];
};

type SubscriptionStatusEnvelope = {
  data: SubscriptionStatus;
};

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await httpRequest<SubscriptionStatusEnvelope>("/subscription/status");
  return unwrapData<SubscriptionStatus>(response);
}
