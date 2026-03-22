import { Loader2 } from "lucide-react";

import { PageCard } from "@/shared/ui/page-card";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Cargando..." }: LoadingStateProps) {
  return (
    <PageCard>
      <div className="flex items-center justify-center gap-3 py-12" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-primary-light">{message}</span>
      </div>
    </PageCard>
  );
}

type SkeletonCardProps = {
  count?: number;
};

export function SkeletonCards({ count = 3 }: SkeletonCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <PageCard key={`skeleton-${idx}`} className="animate-pulse">
          <div className="h-4 w-3/4 rounded bg-neutral-dark" />
          <div className="mt-3 h-3 w-1/2 rounded bg-neutral-dark" />
          <div className="mt-2 h-3 w-2/3 rounded bg-neutral-dark" />
        </PageCard>
      ))}
    </div>
  );
}
