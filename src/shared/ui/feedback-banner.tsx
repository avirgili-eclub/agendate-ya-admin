import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { NotificationType } from "@/shared/notifications/notification-types";

type FeedbackBannerProps = {
  tone: NotificationType;
  message: string;
  action?: {
    label: string;
    href: string;
  };
};

export function FeedbackBanner({ tone, message, action }: FeedbackBannerProps) {
  const styles = {
    success: {
      Icon: CheckCircle2,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-600",
    },
    error: {
      Icon: XCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-600",
    },
    warning: {
      Icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
    },
    info: {
      Icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600",
    },
  }[tone];

  const { Icon, bgColor, borderColor, textColor, iconColor } = styles;

  return (
    <div
      className={`rounded-md border ${borderColor} ${bgColor} px-4 py-3`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`size-5 shrink-0 ${iconColor}`} aria-hidden="true" />
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>

        {action ? (
          <a
            href={action.href}
            className={`shrink-0 text-xs font-semibold underline underline-offset-2 ${textColor}`}
          >
            {action.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}
