import type { AppError } from "@/core/errors/app-error";

export type MetricsGranularity = "day" | "week" | "month";

export type MetricsRoleScope = "tenant" | "professional";

export type RevenueComparisonPeriod = "week" | "month";

export type MetricsFilters = {
  from: string;
  to: string;
  granularity?: MetricsGranularity;
  locationIds?: string[];
};

export type RevenueComparisonQuery = {
  anchor: string;
  period: RevenueComparisonPeriod;
  locationIds?: string[];
};

export type MetricsEnvelope<T> = {
  data: T;
};

export type MetricsMeta = {
  from: string;
  to: string;
  granularity: MetricsGranularity;
  timezone: string;
  currency: string;
  revenueBasis: "COMPLETED_ONLY" | (string & {});
  includesToday: boolean;
  todayIsLive: boolean;
};

export type MetricsSeriesBucket = {
  periodStart: string;
  periodEnd: string;
  bookingsCount: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  revenueCompleted: number;
  bookedMinutes: number;
  capacityMinutes: number | null;
  occupancyRate: number | null;
  isToday: boolean;
  isLive: boolean;
};

export type MetricsTotals = {
  bookingsCount: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  revenueCompleted: number;
  completionRate: number | null;
  noShowRate: number | null;
  cancellationRate: number | null;
  averageOccupancyRate: number | null;
  daysWithKnownCapacity: number;
  daysWithNullCapacity: number;
};

export type TopServiceMetric = {
  serviceId: string;
  serviceName: string | null;
  bookingsCount: number;
  revenueCompleted: number;
};

export type TopResourceMetric = {
  resourceId: string;
  name: string | null;
  resourceType: "PROFESSIONAL" | "ROOM" | "EQUIPMENT" | "TABLE" | (string & {}) | null;
  bookingsCount: number;
  completedCount: number;
  revenueCompleted: number;
  occupancyRate: number | null;
};

export type TopClientMetric = {
  clientId: string;
  clientName: string | null;
  visitsCount: number;
  revenue: number;
};

export type BaseMetricsData = {
  series: MetricsSeriesBucket[];
  totals: MetricsTotals;
  topServices: TopServiceMetric[];
  topClients: TopClientMetric[];
  meta: MetricsMeta;
};

export type TenantMetricsData = BaseMetricsData & {
  topResources: TopResourceMetric[];
};

export type ProfessionalMetricsApiData = BaseMetricsData & {
  topResources: TopResourceMetric[];
};

export type ProfessionalMetricsData = BaseMetricsData & {
  topResources?: never;
};

export type RevenueComparisonWindow = {
  label: string;
  from: string;
  to: string;
  revenueCompleted: number;
};

export type RevenueComparisonDelta = {
  amount: number;
  percentage: number | null;
};

export type RevenueComparisonPoint = {
  index: number;
  label: string;
  currentDate: string;
  previousDate: string | null;
  currentRevenue: number;
  previousRevenue: number | null;
};

export type RevenueComparisonMeta = {
  anchor: string;
  timezone: string;
  currency: string;
  revenueBasis: "COMPLETED_ONLY" | (string & {});
  includesToday: boolean;
  todayIsLive: boolean;
};

export type RevenueComparisonResponse = {
  period: RevenueComparisonPeriod;
  mode: "period_to_date" | (string & {});
  current: RevenueComparisonWindow;
  previous: RevenueComparisonWindow;
  delta: RevenueComparisonDelta;
  points: RevenueComparisonPoint[];
  meta: RevenueComparisonMeta;
};

export type MetricsDataByScope<TScope extends MetricsRoleScope> = TScope extends "professional"
  ? ProfessionalMetricsData
  : TenantMetricsData;

export type MetricsFeatureNotAvailableState = {
  type: "feature-not-available";
  error: AppError;
};

export type MetricsResourceNotAssignedState = {
  type: "resource-not-assigned";
  error: AppError;
};
