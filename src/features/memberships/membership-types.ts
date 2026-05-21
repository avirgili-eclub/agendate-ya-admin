export type MembershipScheduleMode = "FIXED" | "FLEXIBLE" | "BOTH";
export type ClientSubscriptionScheduleMode = "FIXED" | "FLEXIBLE" | "";
export type MembershipDurationPeriod = "MONTHLY";

export type MembershipStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type MembershipBillingStatus = "PAID" | "PENDING_PAYMENT" | "OVERDUE" | "REFUNDED";

export type MembershipPlan = {
  id: string;
  name: string;
  description?: string;
  durationPeriod: MembershipDurationPeriod;
  classesPerPeriod: number | null;
  price: string;
  currency: string;
  active: boolean;
  scheduleMode: MembershipScheduleMode;
  createdAt?: string;
  updatedAt?: string;
};

export type MembershipPlanInput = {
  name: string;
  description?: string;
  durationPeriod: MembershipDurationPeriod;
  classesPerPeriod: number | null;
  price: number;
  currency: string;
  active: boolean;
  scheduleMode: MembershipScheduleMode;
};

export type MembershipRecurringSlot = {
  id?: string;
  resourceId: string;
  resourceName?: string;
  serviceId?: string;
  serviceName?: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  active?: boolean;
  validFrom?: string;
  validUntil?: string;
};

export type MembershipUpcomingClass = {
  bookingId: string;
  resourceName?: string;
  serviceName?: string;
  startTime: string;
  endTime?: string;
  status?: string;
  consumesQuota?: boolean;
  bookingKind?: "WALK_IN" | "SUBSCRIPTION_REGULAR" | "SUBSCRIPTION_RECOVERY";
};

export type ClientSubscription = {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  planId: string;
  planName: string;
  planScheduleMode?: MembershipScheduleMode;
  scheduleMode: ClientSubscriptionScheduleMode;
  locationId?: string;
  status: MembershipStatus;
  billingStatus?: MembershipBillingStatus;
  classesPerPeriod: number | null;
  classesUsed: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  startsAt?: string;
  endsAt?: string;
  recurringSlots: MembershipRecurringSlot[];
  upcomingClasses: MembershipUpcomingClass[];
  manualRenewalOverride?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClientSubscriptionListParams = {
  status?: MembershipStatus | "ALL";
  clientId?: string;
  planId?: string;
};

export type CreateClientSubscriptionInput = {
  planId: string;
  clientId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  locationId?: string;
  startDate: string;
  endDate: string;
  billingStatus?: MembershipBillingStatus;
  recurringSlots?: MembershipRecurringSlot[];
  notes?: string;
};

export type MembershipOccupancySlot = {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  activeSubscriptions: number;
  availableSlots: number;
};

export type MembershipOccupancy = {
  resourceId: string;
  capacity: number;
  occupancy: MembershipOccupancySlot[];
};

export type MembershipOccupancyParams = {
  resourceId: string;
  validOn?: string;
};
