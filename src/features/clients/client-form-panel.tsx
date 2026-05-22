import { useState, type ChangeEvent, type FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-international-phone/style.css";

import type { AppError } from "@/core/errors/app-error";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";
import {
  fetchBillingDocumentDv,
  toClientsFriendlyMessage,
  type ClientItem,
  type ClientUpsertInput,
  type DocumentType,
} from "@/features/clients/clients-service";
import { Button } from "@/shared/ui/button";
import { SidePanel } from "@/shared/ui/side-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type ClientFormPanelProps = {
  mode: "create" | "edit";
  initialClient?: ClientItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ClientUpsertInput) => Promise<void>;
  error: AppError | null;
  isLoading: boolean;
};

const BILLING_DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: "RUC", label: "RUC" },
  { value: "PASSPORT", label: "Pasaporte" },
];

function getInitialBillingDocumentType(documentType: DocumentType | undefined): DocumentType | "" {
  return documentType === "RUC" || documentType === "PASSPORT" ? documentType : "";
}

export function ClientFormPanel({
  mode,
  initialClient,
  isOpen,
  onClose,
  onSubmit,
  error,
  isLoading,
}: ClientFormPanelProps) {
  const [fullName, setFullName] = useState(initialClient?.fullName ?? "");
  const [phone, setPhone] = useState(initialClient?.phone ?? "+595");
  const [email, setEmail] = useState(initialClient?.email ?? "");
  const [notes, setNotes] = useState(initialClient?.notes ?? "");
  const [documentType, setDocumentType] = useState<DocumentType | "">(() =>
    getInitialBillingDocumentType(initialClient?.documentType),
  );
  const [documento, setDocumento] = useState(initialClient?.documento ?? "");
  const [dv, setDv] = useState(initialClient?.dv ?? "");
  const [ruc, setRuc] = useState(initialClient?.ruc ?? "");
  const [razonSocial, setRazonSocial] = useState(initialClient?.razonSocial ?? "");
  const [billingEmail, setBillingEmail] = useState(initialClient?.billingEmail ?? "");
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dvError, setDvError] = useState<string | null>(null);
  const [isCalculatingDv, setIsCalculatingDv] = useState(false);

  const isRucDocument = documentType === "RUC";
  const isPassportDocument = documentType === "PASSPORT";
  const dvNotNumeric = dv.trim().length > 0 && !/^\d$/.test(dv.trim());
  const rucWarning = documentType === "RUC" && !ruc.trim();
  const razonSocialWarning = documentType === "RUC" && !razonSocial.trim();

  const normalizeRucInput = (value: string) => {
    if (value.includes("-")) {
      const [body, rawDv] = value.split("-");
      return {
        rucBody: body.replace(/\D+/g, ""),
        pastedDv: rawDv?.replace(/\D+/g, "").slice(0, 1) ?? "",
      };
    }

    return {
      rucBody: value.replace(/\D+/g, ""),
      pastedDv: "",
    };
  };

  const handleRucChange = (value: string) => {
    const { rucBody, pastedDv } = normalizeRucInput(value);
    setRuc(rucBody);
    if (pastedDv) {
      setDv(pastedDv);
    }
  };

  const handleRucBlur = async () => {
    const normalizedRuc = ruc.trim();
    if (!normalizedRuc) {
      return;
    }

    setDvError(null);
    try {
      setIsCalculatingDv(true);
      const dvValue = await fetchBillingDocumentDv(normalizedRuc);
      setDv(String(dvValue));
    } catch (calcError) {
      setDvError(toClientsFriendlyMessage(calcError as AppError));
    } finally {
      setIsCalculatingDv(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setDvError(null);

    const validationErrors: Record<string, string> = {};
    if (!phone || phone === "+595" || !isValidPhoneNumber(phone)) {
      validationErrors.phone = "El telefono es obligatorio y debe ser valido.";
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
      documentType: documentType || undefined,
      documento: documento.trim() || undefined,
      dv: isRucDocument ? dv.trim() || undefined : undefined,
      ruc: isRucDocument ? ruc.trim() || undefined : undefined,
      razonSocial: isRucDocument ? razonSocial.trim() || undefined : undefined,
      billingEmail: billingEmail.trim() || undefined,
    };

    try {
      await onSubmit(input);
    } catch (err) {
      setFieldErrors(extractFieldErrors(err as AppError));
    }
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo Cliente" : "Editar Cliente"}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && !error.details ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{toClientsFriendlyMessage(error)}</div>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-light">Datos basicos</h3>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">Nombre Completo *</span>
            <input
              type="text"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              className={`h-11 w-full rounded-md border px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2 ${
                fieldErrors.fullName ? "border-red-500" : "border-neutral-dark"
              }`}
              placeholder="Juan Perez"
            />
            {fieldErrors.fullName ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.fullName}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">Telefono *</span>
            <div className={`register-phone-wrapper mt-1 ${fieldErrors.phone ? "!border-red-500" : ""}`}>
              <PhoneInput
                defaultCountry="py"
                preferredCountries={["py", "ar", "br", "cl", "uy"]}
                disableDialCodeAndPrefix
                showDisabledDialCodeAndPrefix
                defaultMask="(...) ... - ..."
                placeholder="(981) 123 - 456"
                value={phone}
                onChange={(nextPhone) => setPhone(nextPhone)}
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
            {fieldErrors.phone ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.phone}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">Cedula CI / documento de identidad</span>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
              placeholder="Sin puntos ni guiones"
            />
            {fieldErrors.documento ? <p className="mt-1 text-xs text-red-600">{fieldErrors.documento}</p> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className={`h-11 w-full rounded-md border px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2 ${
                fieldErrors.email ? "border-red-500" : "border-neutral-dark"
              }`}
              placeholder="juan@example.com"
            />
            {fieldErrors.email ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.email}</span> : null}
          </label>
        </section>

        <section className="rounded-lg border border-neutral-dark">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setIsBillingOpen((current) => !current)}
            aria-expanded={isBillingOpen}
          >
            <span className="text-sm font-semibold text-primary">Datos de facturacion (opcional)</span>
            {isBillingOpen ? <ChevronUp className="size-4 text-primary-light" /> : <ChevronDown className="size-4 text-primary-light" />}
          </button>

          {isBillingOpen ? (
            <div className="space-y-4 border-t border-neutral-dark px-4 py-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary">Tipo de documento</span>
                <Select value={documentType || undefined} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_DOCUMENT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {isPassportDocument && !documento.trim() ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Para facturar con pasaporte, carga el numero en Datos basicos.
                </p>
              ) : null}

              {isRucDocument ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-primary">Razon social</span>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
                    placeholder="Empresa S.A."
                    maxLength={255}
                  />
                  {razonSocialWarning ? (
                    <p className="mt-1 text-xs text-amber-700">Razon social requerida para facturar.</p>
                  ) : null}
                  {fieldErrors.razonSocial ? <p className="mt-1 text-xs text-red-600">{fieldErrors.razonSocial}</p> : null}
                </label>
              ) : null}

              {isRucDocument ? (
                <div>
                  <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_6rem]">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-primary">RUC</span>
                      <input
                        type="text"
                        value={ruc}
                        onChange={(e) => handleRucChange(e.target.value)}
                        onBlur={handleRucBlur}
                        className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
                        maxLength={20}
                        inputMode="numeric"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-primary">DV</span>
                      <input
                        type="text"
                        value={dv}
                        onChange={(e) => setDv(e.target.value.slice(0, 1))}
                        className="h-11 w-full rounded-md border border-neutral-dark px-3 text-center text-sm text-primary outline-none ring-primary-light focus:ring-2"
                        inputMode="numeric"
                        maxLength={1}
                        aria-busy={isCalculatingDv}
                      />
                    </label>
                  </div>
                  {rucWarning ? (
                    <p className="mt-1 text-xs text-amber-700">RUC requerido para facturar.</p>
                  ) : null}
                  {dvNotNumeric ? <p className="mt-1 text-xs text-red-600">DV debe ser un digito.</p> : null}
                  {dvError ? <p className="mt-1 text-xs text-red-600">{dvError}</p> : null}
                  {fieldErrors.ruc ? <p className="mt-1 text-xs text-red-600">{fieldErrors.ruc}</p> : null}
                  {fieldErrors.dv ? <p className="mt-1 text-xs text-red-600">{fieldErrors.dv}</p> : null}
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-primary">Email de facturacion</span>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm text-primary outline-none ring-primary-light focus:ring-2"
                  placeholder="comprobantes@empresa.com.py"
                  maxLength={255}
                />
                <p className="mt-1 text-xs text-primary-light">
                  Si difiere del email de contacto. Usado para enviar comprobantes.
                </p>
                {fieldErrors.billingEmail ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.billingEmail}</p>
                ) : null}
              </label>
            </div>
          ) : null}
        </section>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary">Notas</span>
          <textarea
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm text-primary outline-none ring-primary-light focus:ring-2"
            placeholder="Informacion adicional sobre el cliente..."
          />
        </label>

        <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : mode === "create" ? "Crear Cliente" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
