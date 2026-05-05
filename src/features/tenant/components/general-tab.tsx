import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Edit,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Save,
  X,
  Youtube,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchTenantInfo,
  publishTenantSite,
  toTenantFriendlyMessage,
  unpublishTenantSite,
  updateTenantInfo,
  type TenantUpdateInput,
} from "@/features/tenant/tenant-service";
import {
  fetchBusinessSubTypes,
  formatBusinessTypeLabel,
  formatBusinessSubTypeLabel,
} from "@/shared/lib/business-subtypes";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";

const AVAILABLE_TIMEZONES = [
  { value: "America/Asuncion", label: "Paraguay (GMT-3)" },
  { value: "America/Buenos_Aires", label: "Argentina (GMT-3)" },
  { value: "America/Sao_Paulo", label: "Brasil (GMT-3)" },
  { value: "America/Santiago", label: "Chile (GMT-3)" },
  { value: "America/Montevideo", label: "Uruguay (GMT-3)" },
];

const REQUIREMENTS_LABELS: Record<string, string> = {
  "At least 1 active service is required": "Necesitas al menos 1 servicio activo.",
  "At least 1 active resource is required": "Necesitas al menos 1 recurso activo.",
  "At least 1 active location with an address is required":
    "Necesitas al menos 1 sede activa con direccion configurada.",
  "At least 1 resource must have availability rules configured":
    "Al menos 1 recurso debe tener reglas de disponibilidad.",
};

function mapPublishRequirementLabel(message: string): string {
  return REQUIREMENTS_LABELS[message] ?? message;
}

export function GeneralTab() {
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isUnpublishConfirmOpen, setIsUnpublishConfirmOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [timezone, setTimezone] = useState("");
  const [businessSubType, setBusinessSubType] = useState("");
  const [publishWarnings, setPublishWarnings] = useState<string[]>([]);

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
    (option) => option.value === tenantInfo?.businessSubType,
  ) ?? null;

  const businessTypeLabel = (() => {
    if (tenantInfo?.businessType) return formatBusinessTypeLabel(tenantInfo.businessType);
    if (selectedSubTypeOption?.type) return formatBusinessTypeLabel(selectedSubTypeOption.type);
    return null;
  })();

  const updateMutation = useMutation({
    mutationFn: updateTenantInfo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant-info"] });
      setIsEditing(false);
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishTenantSite,
    onSuccess: (result) => {
      setPublishWarnings(result.warnings);
      void queryClient.invalidateQueries({ queryKey: ["tenant-info"] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishTenantSite,
    onSuccess: () => {
      setPublishWarnings([]);
      void queryClient.invalidateQueries({ queryKey: ["tenant-info"] });
    },
  });

  const handleStartEdit = () => {
    if (!tenantInfo) return;
    setName(tenantInfo.name);
    setDescription(tenantInfo.description ?? "");
    setTagline(tenantInfo.tagline ?? "");
    setContactEmail(tenantInfo.contactEmail ?? "");
    setContactPhone(tenantInfo.contactPhone ?? "");
    setInstagramUrl(tenantInfo.instagramUrl ?? "");
    setFacebookUrl(tenantInfo.facebookUrl ?? "");
    setYoutubeUrl(tenantInfo.youtubeUrl ?? "");
    setTimezone(tenantInfo.timezone ?? "");
    setBusinessSubType(tenantInfo.businessSubType ?? "");
    updateMutation.reset();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    updateMutation.reset();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenantInfo) return;
    const nextInstagramUrl = instagramUrl.trim();
    const currentInstagramUrl = tenantInfo.instagramUrl?.trim() ?? "";
    const instagramUrlInput =
      nextInstagramUrl === currentInstagramUrl ? undefined : nextInstagramUrl;

    const nextFacebookUrl = facebookUrl.trim();
    const currentFacebookUrl = tenantInfo.facebookUrl?.trim() ?? "";
    const facebookUrlInput = nextFacebookUrl === currentFacebookUrl ? undefined : nextFacebookUrl;

    const nextYoutubeUrl = youtubeUrl.trim();
    const currentYoutubeUrl = tenantInfo.youtubeUrl?.trim() ?? "";
    const youtubeUrlInput = nextYoutubeUrl === currentYoutubeUrl ? undefined : nextYoutubeUrl;

    const input: TenantUpdateInput = {
      name: name.trim() || undefined,
      timezone: timezone || undefined,
      businessSubType: businessSubType || undefined,
      description: description.trim() || undefined,
      tagline: tagline.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      instagramUrl: instagramUrlInput,
      facebookUrl: facebookUrlInput,
      youtubeUrl: youtubeUrlInput,
    };
    await updateMutation.mutateAsync(input);
  };

  const handlePublishSite = async () => {
    if (!tenantInfo || tenantInfo.sitePublished) return;
    setPublishWarnings([]);
    updateMutation.reset();
    unpublishMutation.reset();
    await publishMutation.mutateAsync();
  };

  const handleUnpublishSite = async () => {
    if (!tenantInfo || !tenantInfo.sitePublished) return;
    setPublishWarnings([]);
    updateMutation.reset();
    publishMutation.reset();
    await unpublishMutation.mutateAsync();
    setIsUnpublishConfirmOpen(false);
  };

  const getSubTypeDisplayLabel = (option: (typeof businessSubTypeOptions)[number]) => {
    if (!option.type) return option.label;
    return `${option.label} (${formatBusinessTypeLabel(option.type)})`;
  };

  if (isLoading) {
    return (
      <PageCard>
        <div className="text-center text-sm text-primary-light">Cargando configuracion...</div>
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

  const updateError = updateMutation.error as AppError | null;
  const publishError = publishMutation.error as AppError | null;
  const unpublishError = unpublishMutation.error as AppError | null;
  const publishRequirementDetails = publishError?.details?.map((detail) => detail.message) ?? [];
  const showPublishRequirements =
    (publishError?.code === "PUBLISH_REQUIREMENTS_NOT_MET" || publishError?.status === 422) &&
    publishRequirementDetails.length > 0;
  const bookingUrl = `https://${tenantInfo.slug}.site.agendateya.app`;

  return (
    <div className="space-y-5">
      <PageCard>
        <div className="flex items-center justify-between border-b border-neutral-dark pb-4">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-primary">Informacion General</h2>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={handleStartEdit}>
              <Edit className="mr-2 size-4" />
              Editar
            </Button>
          )}
        </div>

        {updateError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {toTenantFriendlyMessage(updateError)}
          </div>
        )}

        {unpublishError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {toTenantFriendlyMessage(unpublishError)}
          </div>
        )}

        {showPublishRequirements && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" />
              No se puede publicar todavia. Completa estos puntos:
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {publishRequirementDetails.map((message) => (
                <li key={message}>{mapPublishRequirementLabel(message)}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <Link to="/servicios" className="text-secondary hover:underline">
                Ir a Servicios
              </Link>
              <Link to="/equipos" className="text-secondary hover:underline">
                Ir a Equipos
              </Link>
              <Link to="/locales" className="text-secondary hover:underline">
                Ir a Locales
              </Link>
              <Link to="/disponibilidad" className="text-secondary hover:underline">
                Ir a Disponibilidad
              </Link>
            </div>
          </div>
        )}

        {!showPublishRequirements && publishError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {toTenantFriendlyMessage(publishError)}
          </div>
        )}

        {publishWarnings.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Sitio publicado con avisos:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {publishWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
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
                  Estado de publicacion
                </label>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <StatusChip
                    label={tenantInfo.sitePublished ? "Publicado" : "No publicado"}
                    tone={tenantInfo.sitePublished ? "success" : "neutral"}
                  />
                  {tenantInfo.sitePublished ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsUnpublishConfirmOpen(true)}
                      disabled={unpublishMutation.isPending}
                    >
                      {unpublishMutation.isPending ? "Despublicando..." : "Despublicar sitio"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handlePublishSite}
                      disabled={publishMutation.isPending}
                    >
                      {publishMutation.isPending ? "Publicando..." : "Publicar sitio"}
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-primary-light">
                  {tenantInfo.sitePublished
                    ? "Sitio publicado y visible para clientes."
                    : "No publicado - invisible para clientes."}
                </p>
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

            {(tenantInfo.description || tenantInfo.tagline) && (
              <div className="space-y-3">
                {tenantInfo.description && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Descripcion del sitio
                    </label>
                    <p className="mt-1 text-sm text-primary">{tenantInfo.description}</p>
                  </div>
                )}
                {tenantInfo.tagline && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Tagline
                    </label>
                    <p className="mt-1 text-sm text-primary">{tenantInfo.tagline}</p>
                  </div>
                )}
              </div>
            )}

            {(tenantInfo.contactEmail || tenantInfo.contactPhone) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tenantInfo.contactEmail && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Email de contacto
                    </label>
                    <p className="mt-1 text-sm text-primary">{tenantInfo.contactEmail}</p>
                  </div>
                )}
                {tenantInfo.contactPhone && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Telefono de contacto
                    </label>
                    <p className="mt-1 text-sm text-primary">{tenantInfo.contactPhone}</p>
                  </div>
                )}
              </div>
            )}

            {(tenantInfo.instagramUrl || tenantInfo.facebookUrl || tenantInfo.youtubeUrl) && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Redes sociales
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm">
                  {tenantInfo.instagramUrl && (
                    <a
                      href={tenantInfo.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-secondary hover:underline"
                    >
                      <Instagram className="size-4" />
                      Instagram
                    </a>
                  )}
                  {tenantInfo.facebookUrl && (
                    <a
                      href={tenantInfo.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-secondary hover:underline"
                    >
                      <Facebook className="size-4" />
                      Facebook
                    </a>
                  )}
                  {tenantInfo.youtubeUrl && (
                    <a
                      href={tenantInfo.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-secondary hover:underline"
                    >
                      <Youtube className="size-4" />
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}

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
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                placeholder="Mi Negocio"
              />
            </div>

            <div>
              <label htmlFor="gen-description" className="block text-sm font-medium text-primary">
                Descripcion del sitio
              </label>
              <textarea
                id="gen-description"
                value={description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(event.target.value)
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                placeholder="Conta brevemente que ofrece tu negocio."
              />
            </div>

            <div>
              <label htmlFor="gen-tagline" className="block text-sm font-medium text-primary">
                Tagline
              </label>
              <input
                type="text"
                id="gen-tagline"
                value={tagline}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setTagline(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                placeholder="Ej: Cortes con estilo."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gen-contact-email" className="block text-sm font-medium text-primary">
                  Email de contacto
                </label>
                <input
                  type="email"
                  id="gen-contact-email"
                  value={contactEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setContactEmail(event.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                  placeholder="info@tunegocio.com"
                />
              </div>
              <div>
                <label htmlFor="gen-contact-phone" className="block text-sm font-medium text-primary">
                  Telefono de contacto
                </label>
                <input
                  type="tel"
                  id="gen-contact-phone"
                  value={contactPhone}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setContactPhone(event.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                  placeholder="+5491112345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary">Sitio web publico</label>
              <input
                type="text"
                value={bookingUrl}
                readOnly
                className="mt-1 w-full rounded-md border border-neutral-dark bg-neutral px-3 py-2 text-sm text-primary-light"
              />
            </div>

            <div className="space-y-3 rounded-md border border-neutral-dark p-3">
              <p className="text-sm font-medium text-primary">Redes sociales (opcional)</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="gen-instagram-url"
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <Instagram className="size-4" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    id="gen-instagram-url"
                    value={instagramUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setInstagramUrl(event.target.value)
                    }
                    className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                    placeholder="https://instagram.com/tu-negocio"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gen-facebook-url"
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <Facebook className="size-4" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    id="gen-facebook-url"
                    value={facebookUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFacebookUrl(event.target.value)
                    }
                    className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                    placeholder="https://facebook.com/tu-negocio"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gen-youtube-url"
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <Youtube className="size-4" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    id="gen-youtube-url"
                    value={youtubeUrl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setYoutubeUrl(event.target.value)
                    }
                    className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                    placeholder="https://youtube.com/@tu-negocio"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="gen-timezone" className="block text-sm font-medium text-primary">
                Zona Horaria
              </label>
              <select
                id="gen-timezone"
                value={timezone}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setTimezone(event.target.value)}
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
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setBusinessSubType(event.target.value)
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

            <div className="rounded-md border border-neutral-dark bg-neutral p-3 text-xs text-primary-light">
              La publicacion del sitio se gestiona desde el bloque "Estado de publicacion". Este
              formulario guarda solo datos generales del negocio.
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

      <ConfirmDialog
        isOpen={isUnpublishConfirmOpen}
        title="Despublicar sitio"
        message="El sitio dejara de estar visible para clientes hasta que lo publiques nuevamente."
        confirmLabel="Despublicar"
        pendingLabel="Despublicando..."
        cancelLabel="Cancelar"
        tone="warning"
        isPending={unpublishMutation.isPending}
        onClose={() => {
          if (unpublishMutation.isPending) return;
          setIsUnpublishConfirmOpen(false);
        }}
        onConfirm={() => void handleUnpublishSite()}
      />
    </div>
  );
}
