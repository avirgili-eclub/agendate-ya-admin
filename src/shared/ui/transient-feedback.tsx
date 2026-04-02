import { useEffect, useState } from "react";

import { FeedbackBanner } from "@/shared/ui/feedback-banner";

export type TransientFeedbackMessage = {
  tone: "success" | "error";
  message: string;
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
      <FeedbackBanner tone={feedback.tone} message={feedback.message} />
      {showProgress && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-dark/40">
          <div
            className={feedback.tone === "success" ? "h-full bg-green-500" : "h-full bg-red-500"}
            style={{ width: `${progress}%`, transition: `width ${durationMs}ms linear` }}
          />
        </div>
      )}
    </div>
  );
}