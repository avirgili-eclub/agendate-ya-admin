import { useState, type ChangeEvent, type FormEvent } from "react";
import { Building2, Globe, Calendar, Edit, Save, X, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchTenantInfo,
  updateTenantInfo,
  toTenantFriendlyMessage,
  type TenantUpdateInput,
} from "@/features/tenant/tenant-service";
import {
  fetchBusinessSubTypes,
  formatBusinessTypeLabel,
  formatBusinessSubTypeLabel,
} from "@/shared/lib/business-subtypes";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";

const AVAILABLE_TIMEZONES = [
  { value: "America/Asuncion", label: "Paraguay (GMT-3)" },
  { value: "America/Buenos_Aires", label: "Argentina (GMT-3)" },
  { value: "America/Sao_Paulo", label: "Brasil (GMT-3)" },
  { value: "America/Santiago", label: "Chile (GMT-3)" },
  { value: "America/Montevideo", label: "Uruguay (GMT-3)" },
];

export function GeneralTab() {
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [businessSubType, setBusinessSubType] = useState("");
  const [published, setPublished] = useState(false);

  const { data: tenantInfo, isLoading, error } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
  });

  const { data: businessSubTypeOptions = [] } = useQuery({
    queryKey: ["business-subtypes"],
    queryFn: fetchBusinessSubTypes,
    staleTime: 5 * 60 * 1000,
  });

  const selectedSubTypeOption = businessSubTypeOptions.find(
    (o) => o.value === tenantInfo?.businessSubType,
  ) ?? null;

  const businessTypeLabel = (() => {
    if (tenantInfo?.businessType) return formatBusinessTypeLabel(tenantInfo.businessType);
    if (selectedSubTypeOption?.type) return formatBusinessTypeLabel(selectedSubTypeOption.type);
    return null;
  })();

  const updateMutation = useMutation({
    mutationFn: updateTenantInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-info"] });
      setIsEditing(false);
    },
  });

  const handleStartEdit = () => {
    if (!tenantInfo) return;
    setName(tenantInfo.name);
    setTimezone(tenantInfo.timezone ?? "");
    setBusinessSubType(tenantInfo.businessSubType ?? "");
    setPublished(tenantInfo.published ?? false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    updateMutation.reset();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input: TenantUpdateInput = {
      name: name.trim() || undefined,
      timezone: timezone || undefined,
      businessSubType: businessSubType || undefined,
      published,
    };
    await updateMutation.mutateAsync(input);
  };

  const getSubTypeDisplayLabel = (option: (typeof businessSubTypeOptions)[number]) => {
    if (!option.type) return option.label;
    return `${option.label} (${formatBusinessTypeLabel(option.type)})`;
  };

  if (isLoading) {
    return (
      <PageCard>
        <div className="text-center text-sm text-primary-light">Cargando configuración...</div>
      </PageCard>
    );
  }

  if (error) {
    return (
      <PageCard>
        <div className="text-center text-sm text-red-600">
          {toTenantFriendlyMessage(error as unknown as AppError)}
        </div>
      </PageCard>
    );
  }

  if (!tenantInfo) return null;

  const bookingUrl = `https://${tenantInfo.slug}.site.agendateya.app`;

  return (
    <div className="space-y-5">
      <PageCard>
        <div className="flex items-center justify-between border-b border-neutral-dark pb-4">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-primary">Información General</h2>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={handleStartEdit}>
              <Edit className="mr-2 size-4" />
              Editar
            </Button>
          )}
        </div>

        {updateMutation.error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {toTenantFriendlyMessage(updateMutation.error as unknown as AppError)}
          </div>
        )}

        {!isEditing ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Nombre del Negocio
                </label>
                <p className="mt-1 text-sm font-semibold text-primary">{tenantInfo.name}</p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Estado de publicación
                </label>
                <div className="mt-1.5">
                  <StatusChip
                    label={tenantInfo.published ? "Publicado" : "No publicado"}
                    tone={tenantInfo.published ? "success" : "neutral"}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                Identificador (Slug)
              </label>
              <p className="mt-1 text-sm text-primary">{tenantInfo.slug}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-secondary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {bookingUrl}
                </a>
              </div>
            </div>

            {tenantInfo.timezone && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Zona Horaria
                </label>
                <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                  <Globe className="size-4" />
                  {AVAILABLE_TIMEZONES.find((tz) => tz.value === tenantInfo.timezone)?.label ??
                    tenantInfo.timezone}
                </p>
              </div>
            )}

            {tenantInfo.businessSubType && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                    Especialidad
                  </label>
                  <p className="mt-1 text-sm text-primary">
                    {selectedSubTypeOption?.label ??
                      formatBusinessSubTypeLabel(tenantInfo.businessSubType)}
                  </p>
                </div>
                {businessTypeLabel && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Tipo de Negocio
                    </label>
                    <p className="mt-1 text-sm text-primary">{businessTypeLabel}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                Cuenta creada
              </label>
              <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                <Calendar className="size-4" />
                {new Date(tenantInfo.createdAt).toLocaleDateString("es-PY", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="gen-name" className="block text-sm font-medium text-primary">
                Nombre del Negocio
              </label>
              <input
                type="text"
                id="gen-name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                placeholder="Mi Negocio"
              />
            </div>

            <div>
              <label htmlFor="gen-timezone" className="block text-sm font-medium text-primary">
                Zona Horaria
              </label>
              <select
                id="gen-timezone"
                value={timezone}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
              >
                <option value="">Selecciona una zona horaria</option>
                {AVAILABLE_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gen-subtype" className="block text-sm font-medium text-primary">
                Especialidad del Negocio
              </label>
              <select
                id="gen-subtype"
                value={businessSubType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setBusinessSubType(e.target.value)
                }
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
              >
                <option value="">Selecciona una especialidad</option>
                {businessSubTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getSubTypeDisplayLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">
                Estado de publicación
              </label>
              <button
                type="button"
                onClick={() => setPublished((prev) => !prev)}
                className={`mt-2 inline-flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  published
                    ? "border-success/30 bg-success/10 text-success-dark hover:bg-success/20"
                    : "border-neutral-dark bg-white text-primary-light hover:bg-neutral"
                }`}
              >
                {published ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                {published ? "Sitio publicado — visible para clientes" : "No publicado — invisible para clientes"}
              </button>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-dark pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                <X className="mr-2 size-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 size-4" />
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        )}
      </PageCard>
    </div>
  );
}
