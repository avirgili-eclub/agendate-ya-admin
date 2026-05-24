type MetricsBucket = {
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

const meta = {
  timezone: "America/Asuncion",
  currency: "PYG",
  revenueBasis: "COMPLETED_ONLY",
  includesToday: true,
  todayIsLive: true,
} as const;

function bucket(
  date: string,
  bookingsCount: number,
  completedCount: number,
  noShowCount: number,
  cancelledCount: number,
  revenueCompleted: number,
  bookedMinutes: number,
  capacityMinutes: number | null,
  occupancyRate: number | null,
): MetricsBucket {
  return {
    periodStart: date,
    periodEnd: date,
    bookingsCount,
    completedCount,
    noShowCount,
    cancelledCount,
    revenueCompleted,
    bookedMinutes,
    capacityMinutes,
    occupancyRate,
    isToday: date === "2026-05-22",
    isLive: date === "2026-05-22",
  };
}

function service(index: number, bookingsCount: number, revenueCompleted: number) {
  return {
    serviceId: `5b1f9c2a-000${index}-4a10-9c01-${"abcdefghijklmnopqrstuvwxyz".slice(index - 1, index).repeat(12)}`,
    bookingsCount,
    revenueCompleted,
  };
}

function client(index: number, visitsCount: number, revenue: number) {
  return {
    clientId: `9e3c2d00-000${index}-4c30-9e03-${"abcd".slice(index - 1, index).repeat(4)}0000${"abcd".slice(index - 1, index).repeat(4)}`,
    visitsCount,
    revenue,
  };
}

function resource(index: number, resourceType: "PROFESSIONAL" | "ROOM", bookingsCount: number, completedCount: number, revenueCompleted: number, occupancyRate: number | null) {
  return {
    resourceId: `7c2a1b00-000${index}-4b20-9d02-${String(index).repeat(12)}`,
    resourceType,
    bookingsCount,
    completedCount,
    revenueCompleted,
    occupancyRate,
  };
}

export const tenantMetricsFixture = {
  data: {
    series: [
      bucket("2026-05-20", 11, 9, 2, 1, 45000, 540, 720, 0.75),
      bucket("2026-05-21", 13, 12, 1, 2, 60000, 630, 720, 0.875),
      bucket("2026-05-22", 8, 5, 0, 1, 25000, 360, 720, 0.5),
    ],
    totals: {
      bookingsCount: 32,
      completedCount: 26,
      noShowCount: 3,
      cancelledCount: 4,
      completionRate: 0.788,
      noShowRate: 0.091,
      cancellationRate: 0.121,
      revenueCompleted: 130000,
      averageOccupancyRate: 0.7083,
      daysWithKnownCapacity: 3,
      daysWithNullCapacity: 0,
    },
    topServices: [service(1, 18, 90000), service(2, 9, 27000), service(3, 5, 13000)],
    topResources: [resource(1, "PROFESSIONAL", 20, 17, 85000, 0.78), resource(2, "ROOM", 12, 9, 45000, 0.61)],
    topClients: [client(1, 6, 30000), client(2, 4, 20000)],
    meta: { ...meta, from: "2026-05-20", to: "2026-05-22", granularity: "day" },
  },
} as const;

export const professionalMetricsFixture = {
  data: {
    series: [
      bucket("2026-05-20", 5, 4, 1, 0, 20000, 300, 480, 0.625),
      bucket("2026-05-21", 6, 6, 0, 1, 30000, 360, 480, 0.75),
      bucket("2026-05-22", 3, 2, 0, 0, 10000, 120, 480, 0.25),
    ],
    totals: {
      bookingsCount: 14,
      completedCount: 12,
      noShowCount: 1,
      cancelledCount: 1,
      completionRate: 0.857,
      noShowRate: 0.071,
      cancellationRate: 0.071,
      revenueCompleted: 60000,
      averageOccupancyRate: 0.5417,
      daysWithKnownCapacity: 3,
      daysWithNullCapacity: 0,
    },
    topServices: [service(1, 9, 45000), service(3, 3, 9000)],
    topResources: [],
    topClients: [client(1, 3, 15000), client(3, 2, 10000)],
    meta: { ...meta, from: "2026-05-20", to: "2026-05-22", granularity: "day" },
  },
} as const;

export const tenantMetricsWithUnknownOccupancyFixture = {
  data: {
    series: [
      bucket("2026-05-18", 4, 3, 1, 0, 15000, 240, null, null),
      bucket("2026-05-19", 6, 5, 0, 1, 25000, 300, null, null),
      bucket("2026-05-20", 11, 9, 2, 1, 45000, 540, 720, 0.75),
      bucket("2026-05-21", 13, 12, 1, 2, 60000, 630, 720, 0.875),
      bucket("2026-05-22", 8, 5, 0, 1, 25000, 360, 720, 0.5),
    ],
    totals: {
      bookingsCount: 42,
      completedCount: 34,
      noShowCount: 4,
      cancelledCount: 5,
      completionRate: 0.791,
      noShowRate: 0.093,
      cancellationRate: 0.116,
      revenueCompleted: 170000,
      averageOccupancyRate: 0.7083,
      daysWithKnownCapacity: 3,
      daysWithNullCapacity: 2,
    },
    topServices: [service(1, 22, 110000), service(2, 12, 36000)],
    topResources: [resource(1, "PROFESSIONAL", 26, 22, 110000, 0.79), resource(3, "ROOM", 16, 12, 60000, null)],
    topClients: [client(1, 7, 35000), client(2, 5, 25000)],
    meta: { ...meta, from: "2026-05-18", to: "2026-05-22", granularity: "day" },
  },
} as const;
