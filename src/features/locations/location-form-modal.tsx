import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import {
  processLocationFormError,
  toLocationsFriendlyMessage,
  type LocationItem,
  type LocationUpsertInput,
} from "@/features/locations/locations-service";
import { Button } from "@/shared/ui/button";

type LocationFormModalProps = {
  mode: "create" | "edit";
  initialLocation?: LocationItem;
  isOpen: boolean;
  isLoading: boolean;
  error: AppError | null;
  onClose: () => void;
  onSubmit: (input: LocationUpsertInput) => Promise<void>;
};

export function LocationFormModal({
  mode,
  initialLocation,
  isOpen,
  isLoading,
  error,
  onClose,
  onSubmit,
}: LocationFormModalProps) {
  const [name, setName] = useState(initialLocation?.name ?? "");
  const [address, setAddress] = useState(initialLocation?.address ?? "");
  const [phone, setPhone] = useState(initialLocation?.phone ?? "");
  const [imageUrl, setImageUrl] = useState(initialLocation?.imageUrl ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(initialLocation?.name ?? "");
    setAddress(initialLocation?.address ?? "");
    setPhone(initialLocation?.phone ?? "");
    setImageUrl(initialLocation?.imageUrl ?? "");
    setFieldErrors({});
    setFormError(null);
  }, [isOpen, initialLocation]);

  useEffect(() => {
    if (!error) {
      return;
    }

    setFormError(toLocationsFriendlyMessage(error));
  }, [error]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    try {
      await onSubmit({ name, address, phone, imageUrl });
    } catch (submitError) {
      const appError = submitError as AppError;
      const parsed = processLocationFormError(appError);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.formError);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-dark bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-neutral-dark px-6 py-4">
          <h2 className="text-xl font-semibold text-primary">
            {mode === "create" ? "Nueva Sede" : "Editar Sede"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-primary-light transition-colors hover:bg-neutral hover:text-primary"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
            )}

            <div>
              <label htmlFor="location-name" className="block text-sm font-medium text-primary">
                Nombre de la sede <span className="text-red-600">*</span>
              </label>
              <input
                id="location-name"
                type="text"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className={`mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none ring-primary-light focus:ring-2 ${
                  fieldErrors.name ? "border-red-500" : "border-neutral-dark"
                }`}
                placeholder="Sede Centro"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="location-address" className="block text-sm font-medium text-primary">
                Dirección
              </label>
              <input
                id="location-address"
                type="text"
                value={address}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                placeholder="Av. Principal 1234"
              />
            </div>

            <div>
              <label htmlFor="location-phone" className="block text-sm font-medium text-primary">
                Teléfono
              </label>
              <input
                id="location-phone"
                type="tel"
                value={phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                placeholder="+595981123456"
              />
            </div>

            <div>
              <label htmlFor="location-image" className="block text-sm font-medium text-primary">
                URL de imagen
              </label>
              <input
                id="location-image"
                type="url"
                value={imageUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                placeholder="https://..."
              />
              {fieldErrors.imageUrl && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.imageUrl}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-neutral-dark pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "create" ? "Crear Sede" : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}