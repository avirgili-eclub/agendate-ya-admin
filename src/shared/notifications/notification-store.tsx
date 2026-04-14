import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import { getSessionState, subscribeSession } from "@/core/auth/session-store";
import {
  createNotificationsStream,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationsStreamEvent,
} from "./notification-backend";
import {
  mapBackendNotification,
  type Notification,
  type NotificationInput,
} from "./notification-types";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (input: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const LAST_EVENT_ID_STORAGE_KEY = "agendateya_admin_notifications_last_event_id";

function getStoredLastEventId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.sessionStorage.getItem(LAST_EVENT_ID_STORAGE_KEY);
  return value || undefined;
}

function storeLastEventId(lastEventId?: string) {
  if (typeof window === "undefined" || !lastEventId) {
    return;
  }

  window.sessionStorage.setItem(LAST_EVENT_ID_STORAGE_KEY, lastEventId);
}

function mergeNotifications(incoming: Notification[], current: Notification[]): Notification[] {
  const byId = new Map<string, Notification>();
  for (const notification of [...incoming, ...current]) {
    if (!byId.has(notification.id)) {
      byId.set(notification.id, notification);
    }
  }

  return Array.from(byId.values())
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 100);
}

function applyStreamEvent(previous: Notification[], event: NotificationsStreamEvent): Notification[] {
  const backendNotification = event.data?.notification;
  if (!backendNotification) {
    return previous;
  }

  if (event.eventName === "notification.deleted") {
    return previous.filter((item) => item.id !== backendNotification.id);
  }

  const mapped = mapBackendNotification(backendNotification);
  const withoutCurrent = previous.filter((item) => item.id !== mapped.id);
  return mergeNotifications([mapped], withoutCurrent);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [backendUnreadCount, setBackendUnreadCount] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(() => getSessionState().accessToken);
  const streamRef = useRef<EventSource | null>(null);
  const unreadSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncBackendUnreadCount = useCallback(async () => {
    try {
      const unread = await fetchUnreadCount();
      setBackendUnreadCount(unread);
    } catch {
      // Keep current counter if backend endpoint is temporarily unavailable.
    }
  }, []);

  const scheduleUnreadCountSync = useCallback(() => {
    if (unreadSyncTimerRef.current !== null) {
      return;
    }

    unreadSyncTimerRef.current = setTimeout(() => {
      unreadSyncTimerRef.current = null;
      void syncBackendUnreadCount();
    }, 250);
  }, [syncBackendUnreadCount]);

  useEffect(() => {
    return subscribeSession((session) => {
      setAccessToken(session.accessToken);
      if (!session.accessToken) {
        setNotifications([]);
        setBackendUnreadCount(0);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(LAST_EVENT_ID_STORAGE_KEY);
        }
        if (unreadSyncTimerRef.current !== null) {
          clearTimeout(unreadSyncTimerRef.current);
          unreadSyncTimerRef.current = null;
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!accessToken) {
      streamRef.current?.close();
      streamRef.current = null;
      if (unreadSyncTimerRef.current !== null) {
        clearTimeout(unreadSyncTimerRef.current);
        unreadSyncTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [listResult, unread] = await Promise.all([
          fetchNotifications(),
          fetchUnreadCount(),
        ]);
        if (cancelled) {
          return;
        }

        const mapped = listResult.items.map(mapBackendNotification);
        setNotifications((previous) => mergeNotifications(mapped, previous));
        setBackendUnreadCount(unread);
      } catch {
        // Silently keep local-only notifications when backend endpoint is not available yet.
      }
    };

    bootstrap();

    streamRef.current?.close();
    streamRef.current = createNotificationsStream(
      accessToken,
      {
        onEvent: (event) => {
          if (event.lastEventId) {
            storeLastEventId(event.lastEventId);
          }

          setNotifications((previous) => {
            const next = applyStreamEvent(previous, event);
            if (typeof event.data?.unreadCount === "number") {
              setBackendUnreadCount(event.data.unreadCount);
            } else if (event.eventName.startsWith("notification.")) {
              scheduleUnreadCountSync();
            }
            return next;
          });
        },
      },
      getStoredLastEventId(),
    );

    return () => {
      cancelled = true;
      streamRef.current?.close();
      streamRef.current = null;
      if (unreadSyncTimerRef.current !== null) {
        clearTimeout(unreadSyncTimerRef.current);
        unreadSyncTimerRef.current = null;
      }
    };
  }, [accessToken, scheduleUnreadCountSync]);

  const addNotification = useCallback((input: NotificationInput) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type: input.type,
      title: input.title,
      message: input.message,
      category: input.category,
      source: "user_action",
      timestamp: new Date(),
      read: false,
      actionUrl: input.actionUrl,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 100));
  }, []);

  const markAsRead = useCallback((id: string) => {
    let requiresBackendSync = false;
    let shouldDecrementBackendCount = false;

    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }

        if (notification.read) {
          return notification;
        }

        requiresBackendSync = notification.source === "backend_event";
        shouldDecrementBackendCount = requiresBackendSync;
        return { ...notification, read: true };
      }),
    );

    if (shouldDecrementBackendCount) {
      setBackendUnreadCount((previous) => Math.max(0, previous - 1));
    }

    if (requiresBackendSync) {
      void markNotificationAsRead(id).catch(() => {
        // Keep optimistic UI to avoid blocking the user on network hiccups.
      });
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    let hasUnreadBackendNotifications = false;

    setNotifications((prev) =>
      prev.map((notification) => {
        if (!notification.read && notification.source === "backend_event") {
          hasUnreadBackendNotifications = true;
        }
        return { ...notification, read: true };
      }),
    );

    if (hasUnreadBackendNotifications) {
      setBackendUnreadCount(0);
      void markAllNotificationsAsRead().catch(() => {
        // Keep optimistic UI to avoid blocking the user on network hiccups.
      });
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    let shouldDecrementBackendCount = false;
    let shouldSyncReadState = false;
    setNotifications((prev) => {
      const target = prev.find((notification) => notification.id === id);
      if (target && !target.read && target.source === "backend_event") {
        shouldDecrementBackendCount = true;
        shouldSyncReadState = true;
      }
      return prev.filter((notification) => notification.id !== id);
    });

    if (shouldDecrementBackendCount) {
      setBackendUnreadCount((previous) => Math.max(0, previous - 1));
    }

    if (shouldSyncReadState) {
      void markNotificationAsRead(id).catch(() => {
        // Keep optimistic UI to avoid blocking the user on network hiccups.
      });
    }
  }, []);

  const clearAll = useCallback(() => {
    let hasUnreadBackendNotifications = false;
    setNotifications((prev) => {
      hasUnreadBackendNotifications = prev.some(
        (notification) => !notification.read && notification.source === "backend_event",
      );
      return [];
    });

    if (hasUnreadBackendNotifications) {
      setBackendUnreadCount(0);
      void markAllNotificationsAsRead().catch(() => {
        // Keep optimistic UI to avoid blocking the user on network hiccups.
      });
    }
  }, []);

  const localUnreadCount = notifications.filter(
    (notification) => !notification.read && notification.source === "user_action",
  ).length;
  const unreadCount = backendUnreadCount + localUnreadCount;

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
