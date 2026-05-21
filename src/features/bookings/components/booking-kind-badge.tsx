import { RefreshCcw, Ticket } from "lucide-react";

import type { BookingKind } from "@/features/agenda/agenda-service";

type BookingKindBadgeProps = {
  kind?: BookingKind;
  size?: "sm" | "md";
};

export function BookingKindBadge({ kind, size = "sm" }: BookingKindBadgeProps) {
  if (kind !== "SUBSCRIPTION_REGULAR" && kind !== "SUBSCRIPTION_RECOVERY") {
    return null;
  }

  const iconSize = size === "md" ? "size-3" : "size-2.5";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  const padding = size === "md" ? "px-2 py-0.5" : "px-1.5 py-0.5";
  const baseClass = `inline-flex items-center gap-1 rounded-full ${padding} ${textSize} font-semibold`;

  if (kind === "SUBSCRIPTION_REGULAR") {
    return (
      <span
        className={`${baseClass} bg-emerald-50 text-emerald-700`}
        title="Clase regular del plan del cliente"
      >
        <Ticket className={iconSize} aria-hidden="true" />
        Cupo membresía
      </span>
    );
  }

  return (
    <span
      className={`${baseClass} bg-amber-50 text-amber-700`}
      title="Recupero / clase adicional fuera del slot regular"
    >
      <RefreshCcw className={iconSize} aria-hidden="true" />
      Recupero
    </span>
  );
}
