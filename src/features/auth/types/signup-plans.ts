export type PlanId = "FREE" | "BASIC" | "PRO";

export interface SignupPlansData {
  defaultPlan: PlanId;
  trialDays: number;
  enabledPlans: PlanId[];
  trialEligiblePlans: PlanId[];
}
