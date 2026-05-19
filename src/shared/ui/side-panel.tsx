import { useEffect, type PropsWithChildren } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

type SidePanelProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
}>;

export function SidePanel({ isOpen, onClose, title, children, className }: SidePanelProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const content = (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[70] h-screen w-full max-w-2xl transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out",
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

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
