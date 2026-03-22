import { CheckCircle2, XCircle } from "lucide-react";

type FeedbackBannerProps = {
  tone: "success" | "error";
  message: string;
};

export function FeedbackBanner({ tone, message }: FeedbackBannerProps) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  const bgColor = tone === "success" ? "bg-green-50" : "bg-red-50";
  const borderColor = tone === "success" ? "border-green-200" : "border-red-200";
  const textColor = tone === "success" ? "text-green-800" : "text-red-800";
  const iconColor = tone === "success" ? "text-green-600" : "text-red-600";

  return (
    <div
      className={`rounded-md border ${borderColor} ${bgColor} px-4 py-3`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-5 shrink-0 ${iconColor}`} aria-hidden="true" />
        <p className={`text-sm ${textColor}`}>{message}</p>
      </div>
    </div>
  );
}
