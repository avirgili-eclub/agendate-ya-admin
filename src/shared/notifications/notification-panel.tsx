import { useEffect } from "react";
import { CheckCheck, Trash2, Bell, X } from "lucide-react";
import { SidePanel } from "@/shared/ui/side-panel";
import { Button } from "@/shared/ui/button";
import { useNotifications } from "./notification-store";
import { cn } from "@/shared/lib/cn";
import type { NotificationType } from "./notification-types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getNotificationStyles(type: NotificationType) {
  switch (type) {
    case "success":
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-800",
        icon: "text-green-600",
      };
    case "error":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-800",
        icon: "text-red-600",
      };
    case "warning":
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-800",
        icon: "text-yellow-600",
      };
    case "info":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-800",
        icon: "text-blue-600",
      };
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead, unreadCount]);

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Notificaciones">
      <div className="space-y-4">
        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-neutral-dark pb-4">
            <p className="text-sm text-primary-light">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo leído"}
            </p>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="gap-2 text-xs"
                >
                  <CheckCheck className="size-4" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="gap-2 text-xs"
              >
                <Trash2 className="size-4" />
                Limpiar
              </Button>
            </div>
          </div>
        )}

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="size-12 text-neutral-dark" />
            <p className="mt-4 text-sm font-medium text-primary">No hay notificaciones</p>
            <p className="mt-1 text-xs text-primary-light">
              Las acciones importantes aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const styles = getNotificationStyles(notification.type);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative rounded-lg border p-4 transition-all",
                    styles.bg,
                    styles.border,
                    !notification.read && "ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {notification.title ? (
                        <p className={cn("text-sm font-semibold", styles.text)}>{notification.title}</p>
                      ) : null}
                      <p className={cn("text-sm", styles.text)}>{notification.message}</p>
                      <p className="mt-1 text-xs text-primary-light">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="rounded p-1 text-primary-light hover:bg-white/50"
                          aria-label="Marcar como leída"
                        >
                          <CheckCheck className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="rounded p-1 text-primary-light hover:bg-white/50"
                        aria-label="Eliminar notificación"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
