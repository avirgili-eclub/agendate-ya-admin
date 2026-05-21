import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneInput } from "react-international-phone";
import { isValidPhoneNumber } from "libphonenumber-js";
import "react-international-phone/style.css";

import type { AppError } from "@/core/errors/app-error";
import { fetchClients, type ClientItem } from "@/features/clients/clients-service";
import {
  fetchLocationResources,
  fetchLocations,
  fetchResourceById,
  type ResourceItem,
} from "@/features/agenda/agenda-service";
import {
  createBooking,
  fetchBookingServicesByResource,
  getBookingErrorMessage,
  type CreateBookingInput,
} from "@/features/bookings/bookings-service";
import { Button } from "@/shared/ui/button";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { extractFieldErrors } from "@/shared/utils/api-error-mapper";

export type BookingCreateFormProps = {
  initialLocationId?: string;
  professional?: {
    resourceId: string;
    resourceName?: string;
  };
  onClose: () => void;
  onCreated: () => void;
};

type ClientMode = "search" | "new";

export function BookingCreateForm({
  initialLocationId,
  professional,
  onClose,
  onCreated,
}: BookingCreateFormProps) {
  const queryClient = useQueryClient();
  const isProfessional = Boolean(professional?.resourceId);
  const professionalResourceId = professional?.resourceId ?? "";
  const professionalResourceName = professional?.resourceName?.trim() || "Mi recurso";

  const [locationId, setLocationId] = useState(initialLocationId ?? "");
  const [resourceId, setResourceId] = useState(isProfessional ? professionalResourceId : "");
  const [serviceId, setServiceId] = useState("");
  const [clientMode, setClientMode] = useState<ClientMode>("search");
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+595");
  const [clientEmail, setClientEmail] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialLocationId) {
      setLocationId(initialLocationId);
    }
  }, [initialLocationId]);

  useEffect(() => {
    if (!isProfessional) return;
    setResourceId((previous) =>
      previous === professionalResourceId ? previous : professionalResourceId,
    );
  }, [isProfessional, professionalResourceId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [clientSearch]);

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });

  const resourcesQuery = useQuery({
    queryKey: ["location-resources", locationId],
    queryFn: () => fetchLocationResources(locationId),
    enabled: Boolean(locationId) && !isProfessional,
    staleTime: 60_000,
  });

  const professionalResourceQuery = useQuery({
    queryKey: ["resource", professionalResourceId],
    queryFn: () => fetchResourceById(professionalResourceId),
    enabled: isProfessional && Boolean(professionalResourceId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isProfessional) return;
    const professionalLocationId = professionalResourceQuery.data?.locationId;
    if (!professionalLocationId) return;
    setLocationId((previous) =>
      previous === professionalLocationId ? previous : professionalLocationId,
    );
  }, [isProfessional, professionalResourceQuery.data?.locationId]);

  const servicesQuery = useQuery({
    queryKey: ["bookings", "services-by-resource", resourceId],
    queryFn: () => fetchBookingServicesByResource(resourceId),
    enabled: Boolean(resourceId),
    staleTime: 60_000,
  });

  const isShortClientSearch =
    debouncedClientSearch.length > 0 && debouncedClientSearch.length < 3;
  const clientsQuery = useQuery({
    queryKey: ["clients", "booking-create", debouncedClientSearch],
    queryFn: () =>
      fetchClients({
        page: 0,
        size: 25,
        ...(debouncedClientSearch.length >= 3 ? { search: debouncedClientSearch } : {}),
      }),
    enabled: clientMode === "search" && !isShortClientSearch,
    staleTime: 30_000,
  });

  const clientOptions = useMemo<ClientItem[]>(() => {
    const list = clientsQuery.data?.clients ?? [];
    if (!selectedClient || list.some((c) => c.id === selectedClient.id)) {
      return list;
    }
    return [selectedClient, ...list];
  }, [clientsQuery.data?.clients, selectedClient]);

  const createMutation = useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] });
      setFormError(null);
      setFieldErrors({});
      onCreated();
      onClose();
    },
    onError: (error: AppError) => {
      if (error.code === "NO_ACTIVE_SUBSCRIPTION_FOR_CLIENT") {
        void queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
      setFieldErrors(extractFieldErrors(error));
      setFormError(getBookingErrorMessage(error));
    },
  });

  function handleClientSelect(value: string) {
    setClientId(value);
    const next = clientOptions.find((c) => c.id === value) ?? null;
    setSelectedClient(next);
    setIsRecovery(false);
  }

  function handleClientModeChange(mode: ClientMode) {
    if (mode === clientMode) return;
    setClientMode(mode);
    setIsRecovery(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.clientId;
      delete next.clientName;
      delete next.clientPhone;
      return next;
    });
    if (mode === "search") {
      setClientName("");
      setClientPhone("+595");
      setClientEmail("");
    } else {
      setClientId("");
      setSelectedClient(null);
      setClientSearch("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validationErrors: Record<string, string> = {};
    if (!isProfessional && !locationId) {
      validationErrors.locationId = "Debes seleccionar un local.";
    }
    if (isProfessional && !professionalResourceId) {
      validationErrors.resourceId = "Tu usuario no tiene recurso asignado.";
    }

    let resolvedClientName = "";
    let resolvedClientPhone = "";
    let resolvedClientEmail: string | undefined;

    if (clientMode === "search") {
      if (!clientId || !selectedClient) {
        validationErrors.clientId = "Selecciona un cliente.";
      } else {
        resolvedClientName = selectedClient.fullName;
        resolvedClientPhone = selectedClient.phone;
        resolvedClientEmail = selectedClient.email;
      }
    } else {
      if (!clientName.trim()) {
        validationErrors.clientName = "El nombre del cliente es obligatorio.";
      }
      if (!clientPhone || clientPhone === "+595" || !isValidPhoneNumber(clientPhone)) {
        validationErrors.clientPhone = "Ingresa un telefono valido.";
      }
      resolvedClientName = clientName.trim();
      resolvedClientPhone = clientPhone;
      resolvedClientEmail = clientEmail || undefined;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const resolvedClientId =
      clientMode === "search" ? selectedClient?.id || undefined : undefined;
    const recoveryAllowed =
      clientMode === "search" && Boolean(selectedClient?.hasActiveSubscription);

    createMutation.mutate({
      resourceId: isProfessional ? professionalResourceId : resourceId,
      serviceId,
      clientId: resolvedClientId,
      clientName: resolvedClientName,
      clientPhone: resolvedClientPhone,
      clientEmail: resolvedClientEmail,
      date,
      startTime,
      notes: notes || undefined,
      isRecovery: recoveryAllowed && isRecovery,
    });
  }

  const locations = locationsQuery.data?.filter((location) => location.active) ?? [];
  const resources: ResourceItem[] = isProfessional
    ? professionalResourceId
      ? [
          {
            id: professionalResourceId,
            locationId: professionalResourceQuery.data?.locationId ?? "",
            name: professionalResourceQuery.data?.name ?? professionalResourceName,
            type: professionalResourceQuery.data?.type ?? "PROFESSIONAL",
            active: true,
          },
        ]
      : []
    : resourcesQuery.data?.filter((resource) => resource.active) ?? [];
  const services = servicesQuery.data?.filter((service) => service.active) ?? [];

  return (
    <form className="space-y-4 px-6 py-4" onSubmit={handleSubmit}>
      {formError && <FeedbackBanner tone="error" message={formError} />}

      <div className="space-y-3 rounded-lg border border-neutral-dark bg-neutral/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-primary-dark">Cliente *</span>
          <div className="inline-flex rounded-md border border-neutral-dark bg-white p-0.5">
            <button
              type="button"
              onClick={() => handleClientModeChange("search")}
              aria-pressed={clientMode === "search"}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
                clientMode === "search"
                  ? "bg-primary text-white"
                  : "text-primary-light hover:text-primary"
              }`}
              title="Buscar cliente existente"
            >
              <Search className="size-3.5" />
              Buscar
            </button>
            <button
              type="button"
              onClick={() => handleClientModeChange("new")}
              aria-pressed={clientMode === "new"}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
                clientMode === "new"
                  ? "bg-primary text-white"
                  : "text-primary-light hover:text-primary"
              }`}
              title="Crear nuevo cliente"
            >
              <UserPlus className="size-3.5" />
              Nuevo
            </button>
          </div>
        </div>

        {clientMode === "search" ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">
                Buscar por nombre o telefono
              </span>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                placeholder="Escribi al menos 3 caracteres"
              />
              {isShortClientSearch ? (
                <span className="mt-1 block text-xs text-primary-light">
                  Escribi al menos 3 caracteres para buscar.
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">
                Seleccionar cliente
              </span>
              <Select
                value={clientId}
                onValueChange={handleClientSelect}
                disabled={clientsQuery.isLoading || clientOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      clientsQuery.isLoading
                        ? "Cargando clientes..."
                        : clientOptions.length === 0
                          ? "Sin resultados"
                          : "Seleccionar cliente"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.clientId && (
                <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientId}</span>
              )}
            </label>

            {selectedClient && (
              <div className="rounded-md border border-neutral-dark bg-white px-3 py-2 text-xs text-primary-light">
                <span className="font-semibold text-primary">{selectedClient.fullName}</span>
                <span className="mx-1.5">|</span>
                <span>{selectedClient.phone}</span>
                {selectedClient.email ? (
                  <>
                    <span className="mx-1.5">|</span>
                    <span>{selectedClient.email}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">
                  Nombre del cliente *
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                  placeholder="Juan Perez"
                />
                {fieldErrors.clientName && (
                  <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientName}</span>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">
                  Telefono *
                </span>
                <div
                  className={`register-phone-wrapper ${
                    fieldErrors.clientPhone ? "!border-red-500" : ""
                  }`}
                >
                  <PhoneInput
                    defaultCountry="py"
                    preferredCountries={["py", "ar", "br", "cl", "uy"]}
                    disableDialCodeAndPrefix
                    showDisabledDialCodeAndPrefix
                    defaultMask="(...) ... - ..."
                    placeholder="(981) 123 - 456"
                    value={clientPhone}
                    onChange={(phone) => setClientPhone(phone)}
                    className="register-phone-root"
                    inputClassName="register-phone-input"
                    inputProps={{
                      name: "clientPhone",
                      autoComplete: "tel",
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
                {fieldErrors.clientPhone && (
                  <span className="mt-1 block text-xs text-red-700">{fieldErrors.clientPhone}</span>
                )}
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-primary-light">
                Email (opcional)
              </span>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
                placeholder="cliente@ejemplo.com"
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Local *</span>
          <Select
            value={locationId}
            onValueChange={(value) => {
              if (isProfessional) return;
              setLocationId(value);
              setResourceId("");
              setServiceId("");
            }}
            disabled={isProfessional}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.locationId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.locationId}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Recurso *</span>
          <Select
            value={resourceId}
            onValueChange={(value) => {
              if (isProfessional) return;
              setResourceId(value);
              setServiceId("");
            }}
            disabled={isProfessional || (!locationId && !isProfessional)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar recurso" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.resourceId && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.resourceId}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Servicio *</span>
        <Select
          value={serviceId}
          onValueChange={setServiceId}
          disabled={!resourceId || servicesQuery.isLoading}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !resourceId
                  ? "Seleccionar recurso primero"
                  : servicesQuery.isLoading
                    ? "Cargando servicios..."
                    : services.length === 0
                      ? "Sin servicios asignados"
                      : "Seleccionar servicio"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.serviceId && (
          <span className="mt-1 block text-xs text-red-700">{fieldErrors.serviceId}</span>
        )}
        {!fieldErrors.serviceId && resourceId && servicesQuery.isError && (
          <span className="mt-1 block text-xs text-red-700">
            No pudimos cargar los servicios del recurso seleccionado.
          </span>
        )}
        {!fieldErrors.serviceId &&
          resourceId &&
          !servicesQuery.isLoading &&
          !servicesQuery.isError &&
          services.length === 0 && (
            <span className="mt-1 block text-xs text-primary-light">
              Este recurso no tiene servicios asignados.
            </span>
          )}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Fecha *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.date && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.date}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary-dark">Hora de inicio *</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-dark px-3 text-sm outline-none ring-primary-light focus:ring-2"
          />
          {fieldErrors.startTime && (
            <span className="mt-1 block text-xs text-red-700">{fieldErrors.startTime}</span>
          )}
        </label>
      </div>

      {clientMode === "search" && selectedClient?.hasActiveSubscription ? (
        <label className="flex items-start gap-3 rounded-lg border border-neutral-dark bg-neutral/30 p-3">
          <input
            type="checkbox"
            checked={isRecovery}
            onChange={(event) => setIsRecovery(event.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-primary"
          />
          <span className="text-sm">
            <span className="block font-medium text-primary-dark">
              ¿Es un turno de recuperación?
            </span>
            <span className="mt-0.5 block text-xs text-primary-light">
              Usa un cupo de la membresía activa del cliente. Requiere que tenga clases disponibles
              (cancelaciones previas con +24hs).
            </span>
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-primary-dark">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-dark px-3 py-2 text-sm outline-none ring-primary-light focus:ring-2"
          placeholder="Informacion adicional sobre el turno"
        />
      </label>

      <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Guardando..." : "Crear turno"}
        </Button>
      </div>
    </form>
  );
}
