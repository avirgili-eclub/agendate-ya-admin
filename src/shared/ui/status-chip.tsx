import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/cn";

const statusChipVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        success: "bg-success/20 text-success-dark",
        warning: "bg-secondary/20 text-secondary-dark",
        neutral: "bg-neutral-dark text-primary-light",
        danger: "bg-red-100 text-red-700",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type StatusChipProps = VariantProps<typeof statusChipVariants> & {
  label: string;
  className?: string;
};

export function StatusChip({ label, tone, className }: StatusChipProps) {
  return <span className={cn(statusChipVariants({ tone }), className)}>{label}</span>;
}
