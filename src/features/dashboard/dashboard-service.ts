import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";

export type DashboardKpi = {
  label: string;
  value: string;
  trend?: string;
};

export type UpcomingBooking = {
  id: string;
  clientName: string;
  serviceName: string;
  resourceName: string;
  startsAtLabel: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
};

export type SourceChannelMetric = {
  channel: "WEB" | "WHATSAPP" | "API" | "MCP" | "ADMIN";
  percentage: number;
};

export type DashboardSnapshot = {
  kpis: DashboardKpi[];
  upcomingBookings: UpcomingBooking[];
  sourceChannels: SourceChannelMetric[];
  alerts: string[];
};

type DataEnvelope<T> = { data: T };
type PagedEnvelope<T> = {
  data: T[];
  meta: {
    page: number;
    size: number;
    total: number;
  };
};

type ApiBooking = {
  id: string;
  resourceId: string;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  sourceChannel: SourceChannelMetric["channel"];
  clientName?: string | null;
  serviceName?: string | null;
  resourceName?: string | null;
};

type ApiLocation = {
  id: string;
  name: string;
};

type ApiResource = {
  id: string;
  locationId: string;
  active: boolean;
};

type ApiService = {
  id: string;
  name: string;
  active: boolean;
  requiresResource: boolean;
};

function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function isSameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatHourLabel(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

async function fetchAllBookings(): Promise<ApiBooking[]> {
  const first = await httpRequest<PagedEnvelope<ApiBooking>>("/bookings?page=0&size=100");
  const firstPageBookings = first.data;
  const totalPages = Math.ceil(first.meta.total / first.meta.size);

  if (totalPages <= 1) {
    return firstPageBookings;
  }

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }).map((_, idx) => {
      const page = idx + 1;
      return httpRequest<PagedEnvelope<ApiBooking>>(`/bookings?page=${page}&size=${first.meta.size}`);
    }),
  );

  return [
    ...firstPageBookings,
    ...remaining.flatMap((page) => page.data),
  ];
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [bookings, locations, services] = await Promise.all([
    fetchAllBookings(),
    httpRequest<DataEnvelope<ApiLocation[]>>("/locations").then((response) =>
      unwrapData<ApiLocation[]>(response),
    ),
    httpRequest<DataEnvelope<ApiService[]>>("/services").then((response) =>
      unwrapData<ApiService[]>(response),
    ),
  ]);

  const resourcesByLocation = await Promise.all(
    locations.map(async (location) => {
      const response = await httpRequest<DataEnvelope<ApiResource[]>>(
        `/locations/${location.id}/resources`,
      );
      return unwrapData<ApiResource[]>(response);
    }),
  );

  const resources = resourcesByLocation.flat();
  const assignedByResource = await Promise.all(
    resources.map(async (resource) => {
      const response = await httpRequest<DataEnvelope<ApiService[]>>(
        `/resources/${resource.id}/services`,
      );
      return {
        resourceId: resource.id,
        serviceIds: unwrapData<ApiService[]>(response).map((service) => service.id),
      };
    }),
  );

  const assignedServiceIds = new Set(
    assignedByResource.flatMap((item) => item.serviceIds),
  );
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const lookback30d = new Date(now);
  lookback30d.setDate(lookback30d.getDate() - 30);
  const next24h = new Date(now);
  next24h.setHours(next24h.getHours() + 24);

  const todayBookings = bookings.filter((booking) => {
    const start = new Date(booking.startTime);
    return isSameLocalDate(start, now);
  });

  const confirmedCount = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((booking) => booking.status === "PENDING").length;

  const last30d = bookings.filter((booking) => {
    const start = new Date(booking.startTime);
    return start >= lookback30d && start < dayEnd;
  });
  const noShowCount = last30d.filter((booking) => booking.status === "NO_SHOW").length;
  const noShowRate = percentage(noShowCount, last30d.length);

  const upcomingBookings = bookings
    .filter((booking) => {
      const start = new Date(booking.startTime);
      return start >= now && start <= next24h;
    })
    .sort((left, right) => +new Date(left.startTime) - +new Date(right.startTime))
    .slice(0, 8)
    .map<UpcomingBooking>((booking) => ({
      id: booking.id,
      clientName: booking.clientName ?? "Cliente",
      serviceName: booking.serviceName ?? "Servicio",
      resourceName: booking.resourceName ?? "Recurso",
      startsAtLabel: formatHourLabel(booking.startTime),
      status:
        booking.status === "CONFIRMED"
          ? "CONFIRMED"
          : booking.status === "PENDING"
            ? "PENDING"
            : "CANCELLED",
    }));

  const channels: SourceChannelMetric["channel"][] = ["WEB", "WHATSAPP", "ADMIN", "API", "MCP"];
  const sourceChannels = channels.map((channel) => {
    const count = bookings.filter((booking) => booking.sourceChannel === channel).length;
    return {
      channel,
      percentage: percentage(count, bookings.length),
    };
  });

  const inactiveResourceIds = new Set(
    resources.filter((resource) => !resource.active).map((resource) => resource.id),
  );
  const inactiveWithFutureBookings = bookings.filter((booking) => {
    const start = new Date(booking.startTime);
    return (
      start >= now &&
      inactiveResourceIds.has(booking.resourceId) &&
      (booking.status === "PENDING" || booking.status === "CONFIRMED")
    );
  }).length;

  const servicesWithoutResource = services.filter(
    (service) => service.active && service.requiresResource && !assignedServiceIds.has(service.id),
  ).length;

  const alerts: string[] = [];
  if (inactiveWithFutureBookings > 0) {
    alerts.push(`${inactiveWithFutureBookings} recursos inactivos tienen turnos futuros.`);
  }
  if (servicesWithoutResource > 0) {
    alerts.push(`${servicesWithoutResource} servicios activos no tienen recursos asignados.`);
  }

  return {
    kpis: [
      { label: "Turnos hoy", value: String(todayBookings.length) },
      { label: "Confirmados", value: String(confirmedCount) },
      { label: "Pendientes", value: String(pendingCount) },
      { label: "No-show (30d)", value: `${noShowRate}%` },
    ],
    upcomingBookings,
    sourceChannels,
    alerts,
  };
}
