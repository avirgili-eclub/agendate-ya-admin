import { useState, useEffect } from "react";
import { Palette, Save, RotateCcw, Lock, Wand2, ArrowUpRight, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchTenantBranding,
  updateTenantBranding,
  uploadBrandingLogo,
  uploadBrandingCover,
  suggestBrandingColors,
  toBrandingFriendlyMessage,
  DEFAULT_BRANDING,
  FONT_FAMILY_OPTIONS,
  BORDER_RADIUS_OPTIONS,
  type TenantBranding,
} from "@/features/tenant/tenant-branding-service";
import { fetchTenantInfo, getTierLabel, normalizeTier } from "@/features/tenant/tenant-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { ColorInput } from "@/shared/ui/color-input";
import { ImageUpload } from "@/shared/ui/image-upload";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { cn } from "@/shared/lib/cn";

const BRANDING_TIERS = ["professional", "enterprise"];
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

type Draft = Omit<TenantBranding, "faviconUrl">;

type BrandingTabProps = {
  onDraftChange?: (draft: Draft) => void;
  onUpgradeClick?: () => void;
};

function BrandingPlanGate({
  currentTierLabel,
  onUpgradeClick,
}: {
  currentTierLabel: string;
  onUpgradeClick?: () => void;
}) {
  return (
    <PageCard>
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="size-7 text-primary opacity-50" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-primary">Branding Personalizado</h2>
          <p className="text-sm text-primary-light">
            Esta función está disponible desde el plan{" "}
            <strong className="text-primary">Profesional</strong>.
          </p>
        </div>

        <p className="max-w-sm text-sm text-primary-light">
          Personalizá la identidad visual de tu sitio de reservas con tu logo, paleta de colores,
          tipografía y más para reflejar la imagen de tu negocio.
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left">
          {[
            "Logo y cover personalizado",
            "Paleta de colores completa",
            "Tipografía y bordes",
            "Sugerencias de colores con IA",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-primary">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-[10px] font-bold text-secondary-dark">
                ✓
              </span>
              {f}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border border-neutral-dark bg-neutral px-3 py-1.5 text-xs text-primary-light">
            Plan actual: <strong>{currentTierLabel}</strong>
          </div>
          <Button onClick={onUpgradeClick}>
            <Zap className="mr-2 size-4" />
            Actualizar plan
            <ArrowUpRight className="ml-1.5 size-3.5" />
          </Button>
        </div>
      </div>
    </PageCard>
  );
}

export function BrandingTab({ onDraftChange, onUpgradeClick }: BrandingTabProps) {
  const queryClient = useQueryClient();
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");

  const { data: tenantInfo, isLoading: isLoadingTenant } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
  });

  const tier = normalizeTier(tenantInfo?.subscriptionTier ?? "free");
  const hasBrandingAccess = BRANDING_TIERS.includes(tier);

  const { data: branding, isLoading: isLoadingBranding, error } = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: fetchTenantBranding,
    enabled: hasBrandingAccess,
  });

  const [draft, setDraft] = useState<Draft>({ ...DEFAULT_BRANDING });
  const [isDirty, setIsDirty] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [supportHighlighted, setSupportHighlighted] = useState(false);

  useEffect(() => {
    if (branding) {
      setDraft({ ...branding });
      setIsDirty(false);
    }
  }, [branding]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const updateField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: updateTenantBranding,
    onSuccess: (saved) => {
      queryClient.setQueryData(["tenant-branding"], saved);
      setIsDirty(false);
      showFeedback("success", "Branding guardado correctamente.");
    },
    onError: (err) => {
      showFeedback("error", toBrandingFriendlyMessage(err as unknown as AppError));
    },
  });

  const suggestMutation = useMutation({
    mutationFn: suggestBrandingColors,
    onSuccess: (suggested) => {
      setDraft((prev) => ({ ...prev, ...suggested }));
      setIsDirty(true);
      setSupportHighlighted(true);
      setTimeout(() => setSupportHighlighted(false), 1800);
    },
    onError: (err) => {
      showFeedback("error", toBrandingFriendlyMessage(err as unknown as AppError));
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      accentColor: draft.accentColor,
      backgroundColor: draft.backgroundColor,
      surfaceColor: draft.surfaceColor,
      textColor: draft.textColor,
      textSecondaryColor: draft.textSecondaryColor,
      fontFamily: draft.fontFamily,
      customFontUrl: draft.customFontUrl,
      borderRadius: draft.borderRadius,
    });
  };

  const handleReset = () => {
    if (branding) {
      setDraft({ ...branding });
      setIsDirty(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    setLogoError(null);
    try {
      const { logoUrl } = await uploadBrandingLogo(file);
      setDraft((prev) => ({ ...prev, logoUrl }));
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      showFeedback("success", "Logo actualizado correctamente.");
    } catch (err) {
      setLogoError(toBrandingFriendlyMessage(err as unknown as AppError));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    setCoverError(null);
    try {
      const { coverImageUrl } = await uploadBrandingCover(file);
      setDraft((prev) => ({ ...prev, coverImageUrl }));
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      showFeedback("success", "Cover actualizado correctamente.");
    } catch (err) {
      setCoverError(toBrandingFriendlyMessage(err as unknown as AppError));
    } finally {
      setCoverUploading(false);
    }
  };

  // Plan gate — after all hooks
  if (!isLoadingTenant && tenantInfo && !hasBrandingAccess) {
    return (
      <BrandingPlanGate
        currentTierLabel={getTierLabel(tier)}
        onUpgradeClick={onUpgradeClick}
      />
    );
  }

  if (isLoadingTenant || isLoadingBranding) {
    return (
      <PageCard>
        <div className="text-center text-sm text-primary-light">
          Cargando configuración de branding...
        </div>
      </PageCard>
    );
  }

  if (error) {
    return (
      <PageCard>
        <div className="text-center text-sm text-red-600">
          {toBrandingFriendlyMessage(error as unknown as AppError)}
        </div>
      </PageCard>
    );
  }

  const canSuggest =
    HEX_RE.test(draft.primaryColor) &&
    HEX_RE.test(draft.secondaryColor) &&
    HEX_RE.test(draft.accentColor);

  return (
    <div className="space-y-5">
      {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

      {/* Images */}
      <PageCard>
        <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
          <Palette className="size-5 text-primary" />
          <h2 className="text-base font-semibold text-primary">Imágenes</h2>
        </div>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="mx-auto w-full max-w-[176px] sm:mx-0 sm:w-44 sm:shrink-0">
            <ImageUpload
              label="Logo"
              description="PNG transparente recomendado. Máx. 5MB."
              currentUrl={draft.logoUrl}
              aspectRatio="square"
              isUploading={logoUploading}
              error={logoError}
              onFileSelected={handleLogoUpload}
              onRemove={() => updateField("logoUrl", null)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <ImageUpload
              label="Cover / Portada"
              description="Imagen de fondo del header. Recomendado 1200×400px."
              currentUrl={draft.coverImageUrl}
              aspectRatio="wide"
              isUploading={coverUploading}
              error={coverError}
              onFileSelected={handleCoverUpload}
              onRemove={() => updateField("coverImageUrl", null)}
            />
          </div>
        </div>
      </PageCard>

      {/* Colors */}
      <PageCard>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-dark pb-4">
          <div>
            <h2 className="text-base font-semibold text-primary">Paleta de Colores</h2>
            <p className="mt-1 text-xs text-primary-light">
              Estos colores se aplican en el sitio de reservas de tus clientes.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
            >
              <Save className="mr-1.5 size-3.5" />
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Brand colors */}
        <div className="mt-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-primary">Colores de marca</h3>
            <p className="text-xs text-primary-light">
              Los colores principales que identifican tu negocio.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ColorInput
              label="Color Principal"
              value={draft.primaryColor}
              onChange={(v) => updateField("primaryColor", v)}
            />
            <ColorInput
              label="Color Secundario"
              value={draft.secondaryColor}
              onChange={(v) => updateField("secondaryColor", v)}
            />
            <ColorInput
              label="Color de Acento"
              value={draft.accentColor}
              onChange={(v) => updateField("accentColor", v)}
            />
          </div>
        </div>

        <div className="my-5 border-t border-neutral-dark" />

        {/* Support colors */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-primary">Colores de soporte</h3>
              <p className="text-xs text-primary-light">
                Fondos, superficies y textos. Ajustalos manualmente o dejá que la IA los sugiera.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                suggestMutation.mutate({
                  primaryColor: draft.primaryColor,
                  secondaryColor: draft.secondaryColor,
                  accentColor: draft.accentColor,
                })
              }
              disabled={!canSuggest || suggestMutation.isPending}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all",
                canSuggest && !suggestMutation.isPending
                  ? "border-secondary/40 bg-secondary/5 text-secondary-dark hover:bg-secondary/15"
                  : "cursor-not-allowed border-neutral-dark bg-neutral text-primary-light opacity-50",
              )}
            >
              {suggestMutation.isPending ? (
                <div className="size-3.5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              {suggestMutation.isPending ? "Generando..." : "Sugerir colores"}
            </button>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-4 rounded-xl p-1 transition-all duration-700 sm:grid-cols-2",
              supportHighlighted && "bg-secondary/5 ring-2 ring-secondary/25",
            )}
          >
            <ColorInput
              label="Fondo"
              value={draft.backgroundColor}
              onChange={(v) => updateField("backgroundColor", v)}
            />
            <ColorInput
              label="Superficie"
              value={draft.surfaceColor}
              onChange={(v) => updateField("surfaceColor", v)}
            />
            <ColorInput
              label="Texto Principal"
              value={draft.textColor}
              onChange={(v) => updateField("textColor", v)}
            />
            <ColorInput
              label="Texto Secundario"
              value={draft.textSecondaryColor}
              onChange={(v) => updateField("textSecondaryColor", v)}
            />
          </div>
        </div>
      </PageCard>

      {/* Typography & Shape */}
      <PageCard>
        <div className="flex items-center justify-between border-b border-neutral-dark pb-4">
          <h2 className="text-base font-semibold text-primary">Tipografía y Forma</h2>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
            >
              <Save className="mr-1.5 size-3.5" />
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="font-family"
              className="text-xs font-medium uppercase tracking-wide text-primary-light"
            >
              Tipografía
            </label>
            <select
              id="font-family"
              value={draft.fontFamily}
              onChange={(e) => updateField("fontFamily", e.target.value)}
              className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
            >
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
            <p
              className="text-xs text-primary-light"
              style={{ fontFamily: draft.fontFamily }}
            >
              Vista previa: El negocio de la esquina abre a las 9am.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-primary-light">
              Radio de Bordes
            </span>
            <div className="grid grid-cols-4 gap-2">
              {BORDER_RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("borderRadius", opt.value)}
                  title={opt.label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                    draft.borderRadius === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-neutral-dark text-primary-light hover:border-primary/40",
                  )}
                >
                  <div
                    className="size-6 border-2 border-current"
                    style={{ borderRadius: opt.value }}
                  />
                  <span className="text-[10px] font-medium">{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="custom-font-url"
            className="text-xs font-medium uppercase tracking-wide text-primary-light"
          >
            URL de fuente personalizada (opcional)
          </label>
          <input
            type="url"
            id="custom-font-url"
            value={draft.customFontUrl ?? ""}
            onChange={(e) => updateField("customFontUrl", e.target.value || null)}
            placeholder="https://fonts.googleapis.com/css2?family=..."
            className="mt-1.5 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
          />
        </div>
      </PageCard>

    </div>
  );
}
