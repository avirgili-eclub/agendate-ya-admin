import { useEffect, useState } from "react";

import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import type { NotificationType } from "@/shared/notifications/notification-types";

export type TransientFeedbackMessage = {
  tone: NotificationType;
  message: string;
  action?: {
    label: string;
    href: string;
  };
};

type TransientFeedbackProps = {
  feedback: TransientFeedbackMessage | null;
  onDismiss: () => void;
  durationMs?: number;
  showProgress?: boolean;
};

export function TransientFeedback({
  feedback,
  onDismiss,
  durationMs = 3500,
  showProgress = true,
}: TransientFeedbackProps) {
  const [progress, setProgress] = useState(100);

  const progressColorByTone: Record<NotificationType, string> = {
    success: "h-full bg-green-500",
    error: "h-full bg-red-500",
    warning: "h-full bg-yellow-500",
    info: "h-full bg-blue-500",
  };

  useEffect(() => {
    if (!feedback) {
      return;
    }

    setProgress(100);
    const animationFrame = window.requestAnimationFrame(() => {
      setProgress(0);
    });

    const timeout = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [durationMs, feedback, onDismiss]);

  if (!feedback) {
    return null;
  }

  return (
    <div className="space-y-2">
      <FeedbackBanner tone={feedback.tone} message={feedback.message} action={feedback.action} />
      {showProgress && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-dark/40">
          <div
            className={progressColorByTone[feedback.tone]}
            style={{ width: `${progress}%`, transition: `width ${durationMs}ms linear` }}
          />
        </div>
      )}
    </div>
  );
}