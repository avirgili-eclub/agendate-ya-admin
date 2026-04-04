import { useState, useCallback } from "react";
import { useNotifications } from "./notification-store";
import type { NotificationCategory } from "./notification-types";

export interface FeedbackMessage {
  tone: "success" | "error";
  message: string;
}

/**
 * Hook that manages both transient feedback (toast-like) and persistent notifications.
 * - Shows temporary visual feedback via transient component
 * - Persists notification in global notification center
 */
export function useFeedback(category?: NotificationCategory) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const { addNotification } = useNotifications();

  const showFeedback = useCallback(
    (tone: "success" | "error", message: string) => {
      // Show transient visual feedback
      setFeedback({ tone, message });

      // Persist in notification center
      addNotification({
        type: tone,
        message,
        category,
      });
    },
    [addNotification, category]
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    feedback,
    showFeedback,
    dismissFeedback,
  };
}
