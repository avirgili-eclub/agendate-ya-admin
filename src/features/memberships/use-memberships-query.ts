import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchClientSubscriptionById,
  fetchClientSubscriptions,
  fetchMembershipOccupancy,
  fetchMembershipPlanById,
  fetchMembershipPlans,
} from "@/features/memberships/memberships-service";
import type {
  ClientSubscription,
  ClientSubscriptionListParams,
  MembershipOccupancy,
  MembershipOccupancyParams,
  MembershipPlan,
} from "@/features/memberships/membership-types";

export function useMembershipPlansQuery() {
  return useQuery<MembershipPlan[]>({
    queryKey: ["membership-plans"],
    queryFn: fetchMembershipPlans,
    staleTime: 60_000,
  });
}

export function useMembershipPlanDetailQuery(id: string | null) {
  return useQuery<MembershipPlan>({
    queryKey: ["membership-plan", id],
    queryFn: () => fetchMembershipPlanById(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useClientSubscriptionsQuery(
  params: ClientSubscriptionListParams = {},
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ClientSubscription[]>({
    queryKey: ["client-subscriptions", params],
    queryFn: () => fetchClientSubscriptions(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: options.staleTime ?? 30_000,
  });
}

export function useClientSubscriptionDetailQuery(id: string | null) {
  return useQuery<ClientSubscription>({
    queryKey: ["client-subscription", id],
    queryFn: () => fetchClientSubscriptionById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useMembershipOccupancyQuery(params: MembershipOccupancyParams | null) {
  return useQuery<MembershipOccupancy>({
    queryKey: ["membership-occupancy", params],
    queryFn: () => fetchMembershipOccupancy(params!),
    enabled: Boolean(params?.resourceId),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
