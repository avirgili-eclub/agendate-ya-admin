import { httpRequest } from "@/core/api/http-client";
import { toAppError } from "@/core/errors/app-error";
import type {
  ClientSubscriptionScheduleMode,
  ClientSubscription,
  ClientSubscriptionListParams,
  CreateClientSubscriptionInput,
  MembershipBillingStatus,
  MembershipDurationPeriod,
  MembershipOccupancy,
  MembershipOccupancyParams,
  MembershipOccupancySlot,
  MembershipPlan,
  MembershipPlanInput,
  MembershipRecurringSlot,
  MembershipScheduleMode,
  MembershipStatus,
  MembershipUpcomingClass,
} from "@/features/memberships/membership-types";

type MaybeDataEnvelope<T> = T | { data: T };

type ApiMembershipPlan = {
  id: string;
  name: string;
  description?: string | null;
  durationPeriod?: string | null;
  classesPerPeriod?: number | null;
  price?: string | number | null;
  currency?: string | null;
  active?: boolean | null;
  scheduleMode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiRecurringSlot = {
  id?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  active?: boolean | null;
  validFrom?: string | null;
  validUntil?: string | null;
};

type ApiUpcomingClass = {
  bookingId?: string | null;
  id?: string | null;
  resourceName?: string | null;
  serviceName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  consumesQuota?: boolean | null;
  bookingKind?: "WALK_IN" | "SUBSCRIPTION_REGULAR" | "SUBSCRIPTION_RECOVERY" | null;
};

type ApiClientSubscription = {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  client?: {
    fullName?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  planId?: string | null;
  planName?: string | null;
  plan?: {
    id?: string | null;
    name?: string | null;
    scheduleMode?: string | null;
    classesPerPeriod?: number | null;
  } | null;
  planScheduleMode?: string | null;
  scheduleMode?: string | null;
  locationId?: string | null;
  status?: string | null;
  billingStatus?: string | null;
  classesPerPeriod?: number | null;
  classesUsed?: number | null;
  consumedQuota?: number | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  recurringSlots?: ApiRecurringSlot[] | null;
  upcomingClasses?: ApiUpcomingClass[] | null;
  upcomingBookings?: ApiUpcomingClass[] | null;
  manualRenewalOverride?: boolean | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiOccupancySlot = {
  dayOfWeek?: number | null;
  startTime?: string | null;
  activeSubscriptions?: number | null;
  availableSlots?: number | null;
};

type ApiMembershipOccupancy = {
  resourceId?: string | null;
  capacity?: number | null;
  occupancy?: ApiOccupancySlot[] | null;
};

function unwrapMaybeData<T>(response: MaybeDataEnvelope<T>): T {
  if (typeof response === "object" && response !== null && "data" in response) {
    return response.data;
  }

  return response as T;
}

function pickString(values: Array<string | null | undefined>, fallback: string) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return fallback;
}

function normalizeScheduleMode(value: string | null | undefined): MembershipScheduleMode | undefined {
  if (value === "FIXED" || value === "FLEXIBLE" || value === "BOTH") {
    return value;
  }

  return undefined;
}

function normalizePlanScheduleMode(value: string | null | undefined): MembershipScheduleMode {
  return normalizeScheduleMode(value) ?? "FLEXIBLE";
}

function normalizeSubscriptionScheduleMode(value: string | null | undefined): ClientSubscriptionScheduleMode {
  if (value === "FIXED" || value === "FLEXIBLE") {
    return value;
  }

  return "";
}

function normalizeDurationPeriod(value: string | null | undefined): MembershipDurationPeriod {
  if (value === "MONTHLY") {
    return value;
  }

  return "MONTHLY";
}

function normalizeMembershipStatus(value: string | null | undefined): MembershipStatus {
  if (value === "ACTIVE" || value === "PAUSED" || value === "CANCELLED" || value === "EXPIRED") {
    return value;
  }

  return "ACTIVE";
}

function normalizeBillingStatus(value: string | null | undefined): MembershipBillingStatus | undefined {
  if (value === "PENDING") {
    return "PENDING_PAYMENT";
  }

  if (value === "PAID" || value === "PENDING_PAYMENT" || value === "OVERDUE" || value === "REFUNDED") {
    return value;
  }

  return undefined;
}

function normalizeDayOfWeek(value: number | null | undefined): MembershipRecurringSlot["dayOfWeek"] {
  if (value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }

  return 0;
}

function mapApiPlan(api: ApiMembershipPlan): MembershipPlan {
  return {
    id: api.id,
    name: pickString([api.name], "Plan"),
    description: api.description ?? undefined,
    durationPeriod: normalizeDurationPeriod(api.durationPeriod),
    classesPerPeriod: api.classesPerPeriod ?? null,
    price: String(api.price ?? "0"),
    currency: pickString([api.currency], "PYG"),
    active: api.active ?? true,
    scheduleMode: normalizePlanScheduleMode(api.scheduleMode),
    createdAt: api.createdAt ?? undefined,
    updatedAt: api.updatedAt ?? undefined,
  };
}

function mapApiRecurringSlot(api: ApiRecurringSlot): MembershipRecurringSlot {
  return {
    id: api.id ?? undefined,
    resourceId: pickString([api.resourceId], ""),
    resourceName: api.resourceName ?? undefined,
    serviceId: api.serviceId ?? undefined,
    serviceName: api.serviceName ?? undefined,
    dayOfWeek: normalizeDayOfWeek(api.dayOfWeek),
    startTime: pickString([api.startTime], ""),
    active: api.active ?? undefined,
    validFrom: api.validFrom ?? undefined,
    validUntil: api.validUntil ?? undefined,
  };
}

function mapApiUpcomingClass(api: ApiUpcomingClass): MembershipUpcomingClass {
  return {
    bookingId: pickString([api.bookingId, api.id], ""),
    resourceName: api.resourceName ?? undefined,
    serviceName: api.serviceName ?? undefined,
    startTime: pickString([api.startTime], ""),
    endTime: api.endTime ?? undefined,
    status: api.status ?? undefined,
    consumesQuota: api.consumesQuota ?? undefined,
    bookingKind: api.bookingKind ?? undefined,
  };
}

function mapApiSubscription(api: ApiClientSubscription): ClientSubscription {
  return {
    id: api.id,
    clientId: api.clientId ?? undefined,
    clientName: pickString([api.clientName, api.client?.fullName, api.client?.name], "Cliente"),
    clientPhone: pickString([api.clientPhone, api.client?.phone], ""),
    planId: pickString([api.planId, api.plan?.id], ""),
    planName: pickString([api.planName, api.plan?.name], "Plan"),
    planScheduleMode: normalizeScheduleMode(api.planScheduleMode ?? api.plan?.scheduleMode),
    scheduleMode: normalizeSubscriptionScheduleMode(api.scheduleMode),
    locationId: api.locationId ?? undefined,
    status: normalizeMembershipStatus(api.status),
    billingStatus: normalizeBillingStatus(api.billingStatus),
    classesPerPeriod: api.classesPerPeriod ?? api.plan?.classesPerPeriod ?? null,
    classesUsed: api.consumedQuota ?? api.classesUsed ?? 0,
    currentPeriodStart: api.currentPeriodStart ?? api.startDate ?? undefined,
    currentPeriodEnd: api.currentPeriodEnd ?? api.endDate ?? undefined,
    startsAt: api.startsAt ?? api.startDate ?? undefined,
    endsAt: api.endsAt ?? api.endDate ?? undefined,
    recurringSlots: (api.recurringSlots ?? []).map(mapApiRecurringSlot),
    upcomingClasses: (api.upcomingBookings ?? api.upcomingClasses ?? []).map(mapApiUpcomingClass),
    manualRenewalOverride: api.manualRenewalOverride ?? undefined,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt ?? undefined,
    updatedAt: api.updatedAt ?? undefined,
  };
}

function mapApiOccupancySlot(api: ApiOccupancySlot): MembershipOccupancySlot {
  return {
    dayOfWeek: normalizeDayOfWeek(api.dayOfWeek),
    startTime: pickString([api.startTime], ""),
    activeSubscriptions: api.activeSubscriptions ?? 0,
    availableSlots: api.availableSlots ?? 0,
  };
}

function mapApiOccupancy(api: ApiMembershipOccupancy, fallbackResourceId: string): MembershipOccupancy {
  return {
    resourceId: pickString([api.resourceId, fallbackResourceId], fallbackResourceId),
    capacity: api.capacity ?? 0,
    occupancy: (api.occupancy ?? []).map(mapApiOccupancySlot),
  };
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

function assertOccupancyParams(params: MembershipOccupancyParams) {
  if (!params.resourceId.trim()) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ field: "resourceId", message: "Debes seleccionar un recurso." }],
    });
  }
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const response = await httpRequest<MaybeDataEnvelope<ApiMembershipPlan[]>>("/admin/subscription-plans");
  return unwrapMaybeData(response).map(mapApiPlan);
}

export async function fetchMembershipPlanById(id: string): Promise<MembershipPlan> {
  const response = await httpRequest<MaybeDataEnvelope<ApiMembershipPlan>>(`/admin/subscription-plans/${id}`);
  return mapApiPlan(unwrapMaybeData(response));
}

export async function createMembershipPlan(input: MembershipPlanInput): Promise<MembershipPlan> {
  const response = await httpRequest<MaybeDataEnvelope<ApiMembershipPlan>>("/admin/subscription-plans", {
    method: "POST",
    body: input,
  });
  return mapApiPlan(unwrapMaybeData(response));
}

export async function updateMembershipPlan(id: string, input: MembershipPlanInput): Promise<MembershipPlan> {
  const response = await httpRequest<MaybeDataEnvelope<ApiMembershipPlan>>(`/admin/subscription-plans/${id}`, {
    method: "PUT",
    body: input,
  });
  return mapApiPlan(unwrapMaybeData(response));
}

export async function deleteMembershipPlan(id: string): Promise<void> {
  await httpRequest(`/admin/subscription-plans/${id}`, { method: "DELETE" });
}

export async function fetchClientSubscriptions(
  params: ClientSubscriptionListParams = {},
): Promise<ClientSubscription[]> {
  const query = buildQuery({
    status: params.status && params.status !== "ALL" ? params.status : undefined,
    clientId: params.clientId,
    planId: params.planId,
  });
  const response = await httpRequest<MaybeDataEnvelope<ApiClientSubscription[]>>(
    `/admin/client-subscriptions${query}`,
  );
  return unwrapMaybeData(response).map(mapApiSubscription);
}

export async function fetchClientSubscriptionById(id: string): Promise<ClientSubscription> {
  const response = await httpRequest<MaybeDataEnvelope<ApiClientSubscription>>(
    `/admin/client-subscriptions/${id}`,
  );
  return mapApiSubscription(unwrapMaybeData(response));
}

export async function createClientSubscription(
  input: CreateClientSubscriptionInput,
): Promise<ClientSubscription> {
  const response = await httpRequest<MaybeDataEnvelope<ApiClientSubscription>>("/admin/client-subscriptions", {
    method: "POST",
    body: {
      planId: input.planId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      locationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
      billingStatus: input.billingStatus,
      recurringSlots: input.recurringSlots,
      notes: input.notes,
    },
  });
  return mapApiSubscription(unwrapMaybeData(response));
}

export async function fetchMembershipOccupancy(
  params: MembershipOccupancyParams,
): Promise<MembershipOccupancy> {
  assertOccupancyParams(params);
  const query = buildQuery({
    resourceId: params.resourceId,
    validOn: params.validOn,
  });
  const response = await httpRequest<MaybeDataEnvelope<ApiMembershipOccupancy>>(
    `/admin/client-subscriptions/occupancy${query}`,
  );
  return mapApiOccupancy(unwrapMaybeData(response), params.resourceId);
}

export async function cancelClientSubscription(id: string): Promise<void> {
  await httpRequest(`/admin/client-subscriptions/${id}`, { method: "DELETE" });
}

export async function updateClientSubscriptionBillingStatus(
  id: string,
  billingStatus: MembershipBillingStatus,
): Promise<ClientSubscription> {
  const response = await httpRequest<MaybeDataEnvelope<ApiClientSubscription>>(
    `/admin/client-subscriptions/${id}/billing-status`,
    {
      method: "PATCH",
      body: { billingStatus },
    },
  );
  return mapApiSubscription(unwrapMaybeData(response));
}

export async function updateClientSubscriptionManualRenewalOverride(
  id: string,
  manualRenewalOverride: boolean,
): Promise<ClientSubscription> {
  const response = await httpRequest<MaybeDataEnvelope<ApiClientSubscription>>(
    `/admin/client-subscriptions/${id}/manual-renewal-override`,
    {
      method: "PATCH",
      body: { manualRenewalOverride },
    },
  );
  return mapApiSubscription(unwrapMaybeData(response));
}
