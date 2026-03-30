import type { ReactNode } from "react";
import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/shared/ui/button";

type ConfirmDialogTone = "danger" | "warning";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  tone?: ConfirmDialogTone;
  onClose: () => void;
  onConfirm: () => void;
};

const toneStyles: Record<ConfirmDialogTone, { icon: string; confirmButton: string }> = {
  danger: {
    icon: "text-red-600",
    confirmButton: "bg-red-600 text-white hover:bg-red-700",
  },
  warning: {
    icon: "text-amber-600",
    confirmButton: "bg-amber-500 text-white hover:bg-amber-600",
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  children,
  confirmLabel,
  pendingLabel = "Procesando...",
  cancelLabel = "Cancelar",
  isPending = false,
  tone = "danger",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const styles = toneStyles[tone];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-dark bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-dark px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`size-5 ${styles.icon}`} />
            <h2 className="text-base font-semibold text-primary">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-primary-light transition-colors hover:bg-neutral hover:text-primary"
            aria-label="Cerrar confirmación"
          >
            <X className="size-4" />
          </button>
        </header>

        {(message || children) && (
          <div className="space-y-3 px-5 py-4 text-sm text-primary-light">
            {message ? <p>{message}</p> : null}
            {children}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-neutral-dark px-5 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  );
}