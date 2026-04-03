import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  emptyState?: ReactNode;
  mobileRow?: (row: T) => ReactNode;
  className?: string;
};

type DataTableSortButtonProps = {
  label: string;
  direction: "asc" | "desc" | null;
  onClick: () => void;
  className?: string;
};

export function DataTableSortButton({
  label,
  direction,
  onClick,
  className,
}: DataTableSortButtonProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-left text-sm font-semibold text-primary transition-colors hover:text-primary-dark",
        className,
      )}
    >
      <span>{label}</span>
      <Icon className="size-4" />
    </button>
  );
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  mobileRow,
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return emptyState ? <div className={className}>{emptyState}</div> : null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="hidden overflow-hidden rounded-xl border border-neutral-dark bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-neutral">
              <tr className="border-b border-neutral-dark">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      "px-4 py-3 text-left align-middle text-sm font-semibold text-primary",
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={rowKey(row)} className="border-b border-neutral-dark last:border-b-0 hover:bg-neutral/40">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn("px-4 py-3 align-middle text-sm text-primary-light", column.className)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {mobileRow
          ? data.map((row) => <div key={rowKey(row)}>{mobileRow(row)}</div>)
          : data.map((row) => (
              <div key={rowKey(row)} className="rounded-xl border border-neutral-dark bg-white p-4 shadow-sm">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-start justify-between gap-3 border-b border-neutral-dark/60 py-2 last:border-b-0 last:pb-0 first:pt-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary-light">
                      {column.header}
                    </div>
                    <div className="text-right text-sm text-primary">{column.cell(row)}</div>
                  </div>
                ))}
              </div>
            ))}
      </div>
    </div>
  );
}