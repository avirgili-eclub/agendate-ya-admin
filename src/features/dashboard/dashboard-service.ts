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
  count: number;
};

export type DashboardAlert = {
  code: string;
  severity: "warning" | "info";
  message: string;
};

export type DashboardSnapshot = {
  kpis: DashboardKpi[];
  upcomingBookings: UpcomingBooking[];
  sourceChannels: SourceChannelMetric[];
  alerts: DashboardAlert[];
};

type DataEnvelope<T> = { data: T };

type ApiDashboardSnapshot = {
  context: {
    scope: "RESOURCE" | "TENANT";
    resource: {
      id: string;
      name: string;
      resourceType: "PROFESSIONAL" | "ROOM" | "EQUIPMENT";
      locationId: string;
      active: boolean;
      calendarConnected?: boolean;
    } | null;
  };
  kpis: {
    todayBookings: number;
    confirmed: number;
    pending: number;
    noShow30d: number;
    noShowRate30d: number;
  };
  upcomingBookings: Array<{
    id: string;
    clientName?: string | null;
    serviceName?: string | null;
    resourceName?: string | null;
    startTime: string;
    status: "CONFIRMED" | "PENDING";
  }>;
  sourceChannels: Array<{
    source: SourceChannelMetric["channel"];
    count: number;
  }>;
  alerts: Array<{
    code: string;
    severity: "warning" | "info";
    message: string;
  }>;
};

function formatHourLabel(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const response = await httpRequest<DataEnvelope<ApiDashboardSnapshot>>(
    "/dashboard/snapshot?upcomingLimit=8",
  );
  const data = unwrapData<ApiDashboardSnapshot>(response);

  const sourceTotal = data.sourceChannels.reduce((acc, item) => acc + item.count, 0);
  const severityOrder = { warning: 0, info: 1 } as const;

  return {
    kpis: [
      { label: "Turnos hoy", value: String(data.kpis.todayBookings) },
      { label: "Confirmados", value: String(data.kpis.confirmed) },
      { label: "Pendientes", value: String(data.kpis.pending) },
      {
        label: "No-show (30d)",
        value: String(data.kpis.noShow30d),
        trend: `${data.kpis.noShowRate30d.toFixed(2)}% tasa`,
      },
    ],
    upcomingBookings: data.upcomingBookings.map((booking) => ({
      id: booking.id,
      clientName: booking.clientName ?? "Cliente",
      serviceName: booking.serviceName ?? "Servicio",
      resourceName: booking.resourceName ?? "Recurso",
      startsAtLabel: formatHourLabel(booking.startTime),
      status: booking.status === "PENDING" ? "PENDING" : "CONFIRMED",
    })),
    sourceChannels: data.sourceChannels.map((item) => ({
      channel: item.source,
      count: item.count,
      percentage: percentage(item.count, sourceTotal),
    })),
    alerts: [...data.alerts].sort(
      (left, right) => severityOrder[left.severity] - severityOrder[right.severity],
    ),
  };
}
