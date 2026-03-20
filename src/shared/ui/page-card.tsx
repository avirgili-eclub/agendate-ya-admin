import type { PropsWithChildren } from "react";

import { cn } from "@/shared/lib/cn";

type PageCardProps = PropsWithChildren<{
  className?: string;
}>;

export function PageCard({ children, className }: PageCardProps) {
  return <section className={cn("rounded-xl border border-neutral-dark bg-neutral-light p-5 shadow-sm", className)}>{children}</section>;
}
