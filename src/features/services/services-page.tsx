import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Search, SlidersHorizontal, Plus, Image as ImageIcon, Briefcase } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import { fetchResourceLocations } from "@/features/resources/resources-service";
import { useServicesQuery } from "@/features/services/use-services-query";
import {
  createService,
  deleteService,
  toServicesFriendlyMessage,
  updateService,
  type ServiceItem,
  type ServiceUpsertInput,
} from "@/features/services/services-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { SidePanel } from "@/shared/ui/side-panel";
import { StatusChip } from "@/shared/ui/status-chip";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useFeedback } from "@/shared/notifications/use-feedback";

type SupportedCurrency = "PYG" | "ARS" | "USD" | "EUR";

type CurrencyConfig = {
  label: string;
  prefix: string;
  placeholder: string;
  decimalScale: number;
  fixedDecimalScale: boolean;
};

const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  PYG: {
    label: "PYG - Guaranies",
    prefix: "Gs. ",
    placeholder: "Gs. 120.000",
    decimalScale: 0,
    fixedDecimalScale: false,
  },
  ARS: {
    label: "ARS - Peso argentino",
    prefix: "$ ",
    placeholder: "$ 85.000,00",
    decimalScale: 2,
    fixedDecimalScale: true,
  },
  USD: {
    label: "USD - Dólar",
    prefix: "US$ ",
    placeholder: "US$ 35,00",
    decimalScale: 2,
    fixedDecimalScale: true,
  },
  EUR: {
    label: "EUR - Euro",
    prefix: "€ ",
    placeholder: "€ 28,00",
    decimalScale: 2,
    fixedDecimalScale: true,
  },
};

function formatPriceForCard(currency: string, value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${currency} ${value}`;
  }

  const resolvedCurrency = (currency in CURRENCY_CONFIG ? currency : "PYG") as SupportedCurrency;
  const config = CURRENCY_CONFIG[resolvedCurrency];
  const fractionDigits = config.decimalScale;

  const formatted = new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);

  return `${config.prefix}${formatted}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

type ServiceFormModalProps = {
  mode: "create" | "edit";
  initialService?: ServiceItem;
  onClose: () => void;
  onSubmit: (input: ServiceUpsertInput) => Promise<void>;
};

function ServiceFormModal({ mode, initialService, onClose, onSubmit }: ServiceFormModalProps) {
  const initialCurrency = (initialService?.currency ?? "PYG") as SupportedCurrency;

  const [name, setName] = useState(initialService?.name ?? "");
  const [description, setDescription] = useState(initialService?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState(String(initialService?.durationMinutes ?? 30));
  const [priceValue, setPriceValue] = useState<number | undefined>(() => {
    if (!initialService?.price) {
      return undefined;
    }
    const parsed = Number(initialService.price);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
  const [currency, setCurrency] = useState<SupportedCurrency>(initialCurrency);
  const [requiresResource, setRequiresResource] = useState(initialService?.requiresResource ?? true);
  const [active, setActive] = useState(initialService?.active ?? true);
  const [imageUrl, setImageUrl] = useState(initialService?.imageUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currencyConfig = CURRENCY_CONFIG[currency];

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("El archivo debe ser una imagen válida.");
      return;
    }

    setIsReadingImage(true);
    setFormError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
    } catch {
      setFormError("No se pudo cargar la imagen. Intenta con otro archivo.");
    } finally {
      setIsReadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit({
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        durationMinutes: Number(durationMinutes),
        price: priceValue ?? 0,
        currency,
        requiresResource,
        active,
      });
    } catch (error) {
      const err = error as { message?: string; details?: Array<{ field?: string; message: string }> };
      const nextFieldErrors: Record<string, string> = {};
      for (const detail of err.details ?? []) {
        if (detail.field) {
          nextFieldErrors[detail.field] = detail.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setFormError(err.message ?? "No pudimos guardar el servicio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-primary">
          Nombre *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-primary focus:outline-none"
          placeholder="Ej: Corte clásico"
        />
        {fieldErrors["name"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["name"]}</p>}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary">
          Descripción
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-primary focus:outline-none"
          placeholder="Descripción breve del servicio..."
        />
      </div>

      <div>
        <label htmlFor="imageUpload" className="mb-1 block text-sm font-medium text-primary">
          Imagen del servicio
        </label>
        <div className="rounded-md border border-dashed border-neutral-dark bg-neutral p-3">
          <div className="mb-3 flex items-center gap-3">
            <label
              htmlFor="imageUpload"
              className="inline-flex cursor-pointer items-center rounded-md border border-neutral-dark bg-white px-3 py-2 text-xs text-primary transition-colors hover:bg-neutral"
            >
              <ImageIcon className="mr-2 size-4" />
              {isReadingImage ? "Procesando..." : "Subir imagen"}
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="text-xs text-primary-light underline"
              >
                Quitar imagen
              </button>
            )}
          </div>
          <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Vista previa del servicio"
              className="h-28 w-full rounded-md object-cover"
            />
          ) : (
            <p className="text-xs text-primary-light">Recomendado: formato JPG o PNG, horizontal.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="durationMinutes" className="mb-1 block text-sm font-medium text-primary">
            Duración (minutos) *
          </label>
          <input
            id="durationMinutes"
            type="number"
            min="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-primary focus:outline-none"
          />
          {fieldErrors["durationMinutes"] && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors["durationMinutes"]}</p>
          )}
        </div>

        <div>
          <label htmlFor="currency" className="mb-1 block text-sm font-medium text-primary">
            Moneda
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => {
              const nextCurrency = e.target.value as SupportedCurrency;
              setCurrency(nextCurrency);
              if (nextCurrency === "PYG" && typeof priceValue === "number") {
                setPriceValue(Math.trunc(priceValue));
              }
            }}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-primary focus:outline-none"
          >
            {(Object.keys(CURRENCY_CONFIG) as SupportedCurrency[]).map((code) => (
              <option key={code} value={code}>
                {CURRENCY_CONFIG[code].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="price" className="mb-1 block text-sm font-medium text-primary">
          Precio *
        </label>
        <NumericFormat
          id="price"
          value={priceValue ?? ""}
          placeholder={currencyConfig.placeholder}
          thousandSeparator="."
          decimalSeparator="," 
          allowNegative={false}
          decimalScale={currencyConfig.decimalScale}
          fixedDecimalScale={currencyConfig.fixedDecimalScale}
          prefix={currencyConfig.prefix}
          className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-primary focus:outline-none"
          onValueChange={({ floatValue }) => {
            setPriceValue(floatValue);
          }}
        />
        {fieldErrors["price"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["price"]}</p>}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="requiresResource"
          type="checkbox"
          checked={requiresResource}
          onChange={(e) => setRequiresResource(e.target.checked)}
          className="size-4 rounded border-neutral-dark text-primary focus:ring-2 focus:ring-primary"
        />
        <label htmlFor="requiresResource" className="text-sm text-primary">
          Requiere asignar recurso al reservar
        </label>
      </div>

      {mode === "edit" && (
        <div className="flex items-center gap-3">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border-neutral-dark text-primary focus:ring-2 focus:ring-primary"
          />
          <label htmlFor="active" className="text-sm text-primary">
            Servicio activo (visible para nuevas reservas)
          </label>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting || isReadingImage} className="flex-1">
          {isSubmitting ? "Guardando..." : mode === "create" ? "Crear servicio" : "Actualizar servicio"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ServicesPage() {
  const queryClient = useQueryClient();
  const currentRole = getSessionState().user?.role?.toUpperCase() ?? "";
  const canManageServices = currentRole !== "PROFESSIONAL";
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Todas las ubicaciones");
  const { feedback, showFeedback, dismissFeedback } = useFeedback("service");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [servicePendingDelete, setServicePendingDelete] = useState<ServiceItem | null>(null);

  const locationsQuery = useQuery({
    queryKey: ["services", "locations"],
    queryFn: fetchResourceLocations,
    staleTime: 60_000,
  });

  const servicesQuery = useServicesQuery();

  const locations = useMemo(
    () => ["Todas las ubicaciones", ...(locationsQuery.data ?? []).map((loc) => loc.name)],
    [locationsQuery.data],
  );

  const filteredServices = useMemo(() => {
    if (!servicesQuery.data) {
      return [];
    }

    let filtered = servicesQuery.data;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) ||
          service.description?.toLowerCase().includes(searchLower),
      );
    }

    if (selectedLocation !== "Todas las ubicaciones") {
      // Backend todavía no expone un endpoint location->services.
      // Se mantiene el selector visible para UX, con filtro real pendiente de soporte API.
    }

    return filtered;
  }, [servicesQuery.data, search, selectedLocation]);

  const createServiceMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      showFeedback("success", "Servicio creado correctamente.");
      setShowCreatePanel(false);
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toServicesFriendlyMessage(appError));
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceUpsertInput }) => updateService(id, input),
    onSuccess: () => {
      showFeedback("success", "Servicio actualizado correctamente.");
      setEditingService(null);
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toServicesFriendlyMessage(appError));
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      showFeedback("success", "Servicio eliminado correctamente.");
      setServicePendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error) => {
      const appError = error as unknown as AppError;
      showFeedback("error", toServicesFriendlyMessage(appError));
      setServicePendingDelete(null);
    },
  });

  function handleDelete(service: ServiceItem) {
    setServicePendingDelete(service);
  }

  return (
    <div className="space-y-6">
      <PageCard>
        <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />

        {!canManageServices && (
          <div className="mb-6 rounded-md border border-neutral-dark bg-neutral px-3 py-2 text-sm text-primary-light">
            Tu rol actual permite visualizar y consultar detalles, pero no crear, editar ni eliminar servicios.
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-neutral-dark bg-white py-2 pl-10 pr-4 text-sm text-primary transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Buscar servicios"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:ml-auto lg:w-auto lg:items-center">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-dark bg-white px-4 text-sm text-primary transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-[220px]"
              aria-label="Filtrar por ubicacion"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {canManageServices ? (
              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="outline" size="sm" aria-label="Filtros adicionales" className="h-10 px-3">
                  <SlidersHorizontal className="size-4" />
                </Button>
                <Button size="sm" onClick={() => setShowCreatePanel(true)} className="h-10 flex-1 sm:flex-none">
                  <Plus className="mr-2 size-4" />
                  Nuevo Servicio
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {servicesQuery.isLoading && <LoadingState message="Cargando servicios..." />}

        {servicesQuery.isError && (
          <ErrorState
            title="Error al cargar servicios"
            message="No pudimos cargar el catálogo de servicios. Intenta nuevamente."
            onRetry={() => void servicesQuery.refetch()}
          />
        )}

        {servicesQuery.isSuccess && filteredServices.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="No hay servicios"
            description={search ? "No se encontraron servicios con ese criterio." : "Aún no hay servicios creados. Crea tu primer servicio para comenzar."}
          />
        )}

        {servicesQuery.isSuccess && filteredServices.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="rounded-lg border border-neutral-dark bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="mb-3 h-32 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-32 w-full items-center justify-center rounded-md bg-neutral" aria-hidden="true">
                    <ImageIcon className="size-6 text-primary-light" />
                  </div>
                )}

                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-primary">{service.name}</h3>
                    {service.description && (
                      <p className="mt-1 text-xs text-primary-light line-clamp-2">{service.description}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <StatusChip
                      tone={service.active ? "success" : "neutral"}
                      label={service.active ? "Activo" : "Inactivo"}
                    />
                  </div>
                </div>

                <div className="mb-3 space-y-1 text-xs text-primary-light">
                  <p>
                    <span className="font-medium">Duración:</span> {service.durationMinutes} min
                  </p>
                  <p>
                    <span className="font-medium">Precio:</span> {formatPriceForCard(service.currency, service.price)}
                  </p>
                  {service.requiresResource && (
                    <p className="text-xs italic text-primary-light">Requiere asignar recurso</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedService(service)}
                    className="flex-1 text-xs"
                    aria-label={`Ver detalle de ${service.name}`}
                  >
                    Ver detalle
                  </Button>
                  {canManageServices && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingService(service)}
                        className="flex-1 text-xs"
                        aria-label={`Editar ${service.name}`}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(service)}
                        className="flex-1 text-xs text-red-600 hover:bg-red-50"
                        aria-label={`Eliminar ${service.name}`}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <SidePanel
        isOpen={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        title={selectedService?.name ?? "Detalle de servicio"}
      >
        {selectedService && (
          <div className="space-y-4">
            {selectedService.imageUrl ? (
              <img
                src={selectedService.imageUrl}
                alt={selectedService.name}
                className="h-40 w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-md bg-neutral" aria-hidden="true">
                <ImageIcon className="size-6 text-primary-light" />
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Nombre</p>
              <p className="text-sm font-semibold text-primary">{selectedService.name}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-primary-light">Descripción</p>
              <p className="text-sm text-primary">{selectedService.description ?? "Sin descripción"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Duración</p>
                <p className="text-sm text-primary">{selectedService.durationMinutes} min</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Precio</p>
                <p className="text-sm text-primary">{formatPriceForCard(selectedService.currency, selectedService.price)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Estado</p>
                <StatusChip
                  tone={selectedService.active ? "success" : "neutral"}
                  label={selectedService.active ? "Activo" : "Inactivo"}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Recurso requerido</p>
                <p className="text-sm text-primary">{selectedService.requiresResource ? "Sí" : "No"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Creado</p>
                <p className="text-sm text-primary">{new Date(selectedService.createdAt).toLocaleString("es-PY")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-light">Actualizado</p>
                <p className="text-sm text-primary">{new Date(selectedService.updatedAt).toLocaleString("es-PY")}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedService(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </SidePanel>

      {canManageServices && (
        <SidePanel isOpen={showCreatePanel} onClose={() => setShowCreatePanel(false)} title="Nuevo Servicio">
          <ServiceFormModal
            mode="create"
            onClose={() => setShowCreatePanel(false)}
            onSubmit={async (input) => {
              await createServiceMutation.mutateAsync(input);
            }}
          />
        </SidePanel>
      )}

      {canManageServices && editingService && (
        <SidePanel isOpen={true} onClose={() => setEditingService(null)} title="Editar Servicio">
          <ServiceFormModal
            mode="edit"
            initialService={editingService}
            onClose={() => setEditingService(null)}
            onSubmit={async (input) => {
              await updateServiceMutation.mutateAsync({ id: editingService.id, input });
            }}
          />
        </SidePanel>
      )}

      {canManageServices && (
        <ConfirmDialog
          isOpen={Boolean(servicePendingDelete)}
          title="Confirmar eliminación"
          message={
            <>
              Vas a eliminar el servicio <strong className="text-primary">{servicePendingDelete?.name ?? ""}</strong>.
            </>
          }
          isPending={deleteServiceMutation.isPending}
          pendingLabel="Eliminando..."
          confirmLabel="Eliminar servicio"
          tone="danger"
          onClose={() => setServicePendingDelete(null)}
          onConfirm={() => {
            if (!servicePendingDelete) {
              return;
            }
            deleteServiceMutation.mutate(servicePendingDelete.id);
          }}
        >
          <p>Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
