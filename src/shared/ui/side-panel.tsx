import type { PropsWithChildren } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type SidePanelProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
}>;

export function SidePanel({ isOpen, onClose, title, children, className }: SidePanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-2xl transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          "animate-in slide-in-from-right",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-dark bg-white px-6 py-4 shadow-sm">
          <h2 id="side-panel-title" className="text-xl font-semibold text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-primary-light transition-colors hover:bg-neutral hover:text-primary"
            aria-label="Cerrar panel"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </aside>
    </>
  );
}
