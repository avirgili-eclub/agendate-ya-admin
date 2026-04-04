import { useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-international-phone/style.css";

import type { AppError } from "@/core/errors/app-error";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";
import { toClientsFriendlyMessage, type ClientItem, type ClientUpsertInput } from "@/features/clients/clients-service";
import { Button } from "@/shared/ui/button";

type ClientFormModalProps = {
  mode: "create" | "edit";
  initialClient?: ClientItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ClientUpsertInput) => Promise<void>;
  error: AppError | null;
  isLoading: boolean;
};

export function ClientFormModal({
  mode,
  initialClient,
  isOpen,
  onClose,
  onSubmit,
  error,
  isLoading,
}: ClientFormModalProps) {
  const [fullName, setFullName] = useState(initialClient?.fullName ?? "");
  const [phone, setPhone] = useState(initialClient?.phone ?? "+595");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState("py");
  const [email, setEmail] = useState(initialClient?.email ?? "");
  const [notes, setNotes] = useState(initialClient?.notes ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Frontend validation for phone (mandatory in UI)
    const validationErrors: Record<string, string> = {};
    if (!phone || phone === "+595" || !isValidPhoneNumber(phone)) {
      validationErrors.phone = "El teléfono es obligatorio y debe ser válido.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const input: ClientUpsertInput = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await onSubmit(input);
    } catch (err) {
      const appError = err as AppError;
      // Use the reusable extractFieldErrors helper instead of manual mapping
      setFieldErrors(extractFieldErrors(appError));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-xl border border-neutral-dark bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-dark px-6 py-4">
          <h2 className="text-xl font-semibold text-primary">
            {mode === "create" ? "Nuevo Cliente" : "Editar Cliente"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-primary-light transition-colors hover:bg-neutral hover:text-primary"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Global Error */}
            {error && !error.details && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {toClientsFriendlyMessage(error)}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-primary">
                Nombre Completo <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.fullName ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Juan Pérez"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-primary">
                Teléfono <span className="text-red-600">*</span>
              </label>
              <div className={`register-phone-wrapper mt-1 ${fieldErrors.phone ? "!border-red-500" : ""}`}>
                <PhoneInput
                  defaultCountry="py"
                  preferredCountries={["py", "ar", "br", "cl", "uy"]}
                  disableDialCodeAndPrefix
                  showDisabledDialCodeAndPrefix
                  defaultMask="(...) ... - ..."
                  placeholder="(981) 123 - 456"
                  value={phone}
                  onChange={(phone, meta) => {
                    setPhone(phone);
                    setPhoneCountryIso2(meta.country.iso2);
                  }}
                  className="register-phone-root"
                  inputClassName="register-phone-input"
                  inputProps={{
                    name: "phone",
                    autoComplete: "tel",
                    id: "phone",
                  }}
                  countrySelectorStyleProps={{
                    buttonClassName: "register-phone-country-button",
                    flagClassName: "register-phone-flag",
                    dropdownArrowClassName: "register-phone-country-arrow",
                    dropdownStyleProps: {
                      className: "register-phone-country-dropdown",
                      listItemClassName: "register-phone-country-item",
                      listItemSelectedClassName: "register-phone-country-item-selected",
                      listItemFocusedClassName: "register-phone-country-item-focused",
                    },
                  }}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.email ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="juan@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-primary">
                Notas
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                placeholder="Información adicional sobre el cliente..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "create" ? "Crear Cliente" : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
