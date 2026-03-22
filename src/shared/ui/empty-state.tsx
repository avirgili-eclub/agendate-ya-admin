import type { LucideIcon } from "lucide-react";

import { PageCard } from "@/shared/ui/page-card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <PageCard>
      <div className="py-12 text-center">
        <Icon className="mx-auto size-12 text-neutral-dark" aria-hidden="true" />
        <h3 className="mt-4 text-base font-semibold text-primary">{title}</h3>
        <p className="mt-2 text-sm text-primary-light">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </PageCard>
  );
}
