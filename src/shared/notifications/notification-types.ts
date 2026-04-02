/**
 * Notification model for the global notification center.
 * Prepared for future backend/SSE integration with tenant-level persistence.
 */

export type NotificationType = "success" | "error" | "info" | "warning";

export type NotificationCategory = 
  | "booking"
  | "client"
  | "resource"
  | "service"
  | "user"
  | "system"
  | "general";

export type NotificationSource = "user_action" | "system" | "backend_event";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  category?: NotificationCategory;
  source: NotificationSource;
  timestamp: Date;
  read: boolean;
  /** Future: Link to related entity for quick navigation */
  actionUrl?: string;
  /** Future: Tenant ID when multi-tenant backend is integrated */
  tenantId?: string;
}

export interface NotificationInput {
  type: NotificationType;
  message: string;
  category?: NotificationCategory;
  actionUrl?: string;
}
