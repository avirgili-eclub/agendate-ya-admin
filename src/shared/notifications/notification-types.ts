/**
 * Notification model for the global notification center.
 * Prepared for future backend/SSE integration with tenant-level persistence.
 */

export type NotificationType = "success" | "error" | "info" | "warning";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationCategory = 
  | "booking"
  | "client"
  | "resource"
  | "service"
  | "user"
  | "system"
  | "general";

export type NotificationSource = "user_action" | "system" | "backend_event";

export type NotificationActionKind = "OPEN_ROUTE" | "OPEN_URL" | "NONE";

export interface NotificationAction {
  kind: NotificationActionKind;
  target?: string | null;
}

export interface BackendNotification {
  id: string;
  tenantId?: string;
  type: string;
  severity: NotificationSeverity;
  title?: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  requiresAction: boolean;
  action?: NotificationAction | null;
  metadata?: Record<string, unknown>;
}

export interface BackendNotificationEventData {
  eventId?: string;
  occurredAt?: string;
  notification?: BackendNotification;
  unreadCount?: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  backendType?: string;
  severity?: NotificationSeverity;
  title?: string;
  message: string;
  category?: NotificationCategory;
  source: NotificationSource;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  tenantId?: string;
  requiresAction?: boolean;
  action?: NotificationAction | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationInput {
  type: NotificationType;
  title?: string;
  message: string;
  category?: NotificationCategory;
  actionUrl?: string;
}

export function mapSeverityToNotificationType(severity: NotificationSeverity): NotificationType {
  if (severity === "critical") {
    return "error";
  }

  return severity;
}

export function mapBackendNotification(input: BackendNotification): Notification {
  const actionUrl =
    input.action?.kind === "OPEN_ROUTE" || input.action?.kind === "OPEN_URL"
      ? input.action.target ?? undefined
      : undefined;

  return {
    id: input.id,
    type: mapSeverityToNotificationType(input.severity),
    backendType: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    source: "backend_event",
    timestamp: new Date(input.createdAt),
    read: Boolean(input.readAt),
    actionUrl,
    tenantId: input.tenantId,
    requiresAction: input.requiresAction,
    action: input.action,
    metadata: input.metadata,
  };
}
