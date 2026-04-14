import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import type { BackendNotification, BackendNotificationEventData } from "./notification-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
const STREAM_EVENT_TYPES = [
  "notification.created",
  "notification.updated",
  "notification.deleted",
  "notifications.unread_count",
  "heartbeat",
] as const;

export interface NotificationListResult {
  items: BackendNotification[];
  total?: number;
}

export interface NotificationsStreamEvent {
  eventName: string;
  data: BackendNotificationEventData | null;
  lastEventId?: string;
}

interface ListPayload {
  data?: unknown;
  meta?: {
    total?: number;
  };
  items?: unknown;
  total?: number;
}

interface StreamHandlers {
  onEvent: (event: NotificationsStreamEvent) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
}

function toApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function toAbsoluteApiUrl(path: string): string {
  const fullPath = toApiUrl(path);
  const isAbsolute = /^https?:\/\//i.test(fullPath);
  if (isAbsolute) {
    return fullPath;
  }

  if (typeof window === "undefined") {
    return fullPath;
  }

  return new URL(fullPath, window.location.origin).toString();
}

function tryParseObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  return input as Record<string, unknown>;
}

function parseListPayload(raw: unknown): NotificationListResult {
  const objectPayload = tryParseObject(raw);
  if (!objectPayload) {
    return { items: [] };
  }

  let dataPayload: unknown = objectPayload;
  if ("data" in objectPayload) {
    try {
      dataPayload = unwrapData<unknown>(objectPayload);
    } catch {
      dataPayload = objectPayload.data;
    }
  }

  const listPayload = tryParseObject(dataPayload) as ListPayload | null;
  if (!listPayload) {
    if (Array.isArray(dataPayload)) {
      return { items: dataPayload as BackendNotification[] };
    }
    return { items: [] };
  }

  if (Array.isArray(listPayload.data)) {
    return {
      items: listPayload.data as BackendNotification[],
      total: listPayload.meta?.total,
    };
  }

  if (Array.isArray(listPayload.items)) {
    return {
      items: listPayload.items as BackendNotification[],
      total: listPayload.total,
    };
  }

  return { items: [] };
}

function parseUnreadCount(raw: unknown): number {
  const objectPayload = tryParseObject(raw);
  if (!objectPayload) {
    return 0;
  }

  let dataPayload: unknown = objectPayload;
  if ("data" in objectPayload) {
    try {
      dataPayload = unwrapData<unknown>(objectPayload);
    } catch {
      dataPayload = objectPayload.data;
    }
  }

  if (typeof dataPayload === "number") {
    return dataPayload;
  }

  const parsed = tryParseObject(dataPayload);
  if (!parsed) {
    return 0;
  }

  return typeof parsed.unreadCount === "number" ? parsed.unreadCount : 0;
}

function parseStreamEventData(rawData: string): BackendNotificationEventData | null {
  if (!rawData) {
    return null;
  }

  try {
    return JSON.parse(rawData) as BackendNotificationEventData;
  } catch {
    return null;
  }
}

export async function fetchNotifications(limit = 20): Promise<NotificationListResult> {
  const response = await httpRequest<unknown>(`/admin/notifications?limit=${limit}`);
  return parseListPayload(response);
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await httpRequest<unknown>("/admin/notifications/unread-count");
  return parseUnreadCount(response);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await httpRequest<unknown>(`/admin/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await httpRequest<unknown>("/admin/notifications/read-all", {
    method: "POST",
  });
}

export function createNotificationsStream(
  accessToken: string,
  handlers: StreamHandlers,
  lastEventId?: string,
): EventSource {
  const streamUrl = new URL(toAbsoluteApiUrl("/admin/notifications/stream"));
  streamUrl.searchParams.set("access_token", accessToken);

  if (lastEventId) {
    streamUrl.searchParams.set("lastEventId", lastEventId);
  }

  const source = new EventSource(streamUrl.toString(), { withCredentials: true });

  source.onopen = () => {
    handlers.onOpen?.();
  };

  source.onerror = (error) => {
    handlers.onError?.(error);
  };

  for (const eventName of STREAM_EVENT_TYPES) {
    source.addEventListener(eventName, (rawEvent) => {
      const event = rawEvent as MessageEvent<string>;
      handlers.onEvent({
        eventName,
        data: parseStreamEventData(event.data),
        lastEventId: event.lastEventId,
      });
    });
  }

  source.onmessage = (event) => {
    handlers.onEvent({
      eventName: "message",
      data: parseStreamEventData(event.data),
      lastEventId: event.lastEventId,
    });
  };

  return source;
}
