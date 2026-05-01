import { useState, useEffect, useCallback } from "react";
import { Monitor, Smartphone, RefreshCw, ExternalLink, Clock, AlertTriangle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { fetchTenantInfo } from "@/features/tenant/tenant-service";
import { fetchPreviewToken } from "@/features/tenant/tenant-branding-service";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

type ViewMode = "desktop" | "mobile";

const BOOKING_DOMAIN = (import.meta.env.VITE_BOOKING_SITE_DOMAIN as string | undefined) ?? "site.agendateya.app";

function getBookingUrl(slug: string): string {
  return `https://${slug}.${BOOKING_DOMAIN}`;
}

function msUntilExpiry(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now();
}

export function PreviewTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);

  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
  });

  const {
    data: tokenData,
    isLoading: isLoadingToken,
    error: tokenError,
    isFetching,
  } = useQuery({
    queryKey: ["preview-token", tenantInfo?.id, refreshKey],
    queryFn: fetchPreviewToken,
    enabled: !!tenantInfo?.id,
    staleTime: Infinity,
    gcTime: 16 * 60 * 1000,
    retry: 1,
  });

  // Marcar como expirado 30s antes del TTL real para evitar requests fallidos
  useEffect(() => {
    if (!tokenData?.expiresAt) return;
    setIsExpired(false);
    const ms = msUntilExpiry(tokenData.expiresAt) - 30_000;
    if (ms <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setTimeout(() => setIsExpired(true), ms);
    return () => clearTimeout(timer);
  }, [tokenData?.expiresAt]);

  // Resetear loading del iframe cuando cambia la URL
  useEffect(() => {
    if (tokenData?.token) {
      setIframeLoading(true);
    }
  }, [tokenData?.token]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsExpired(false);
  }, []);

  const slug = tenantInfo?.slug;
  const bookingBaseUrl = slug ? getBookingUrl(slug) : null;
  const iframeUrl =
    bookingBaseUrl && tokenData?.token && !isExpired
      ? `${bookingBaseUrl}?preview_token=${tokenData.token}`
      : null;

  const expiresAtLabel =
    tokenData?.expiresAt
      ? new Date(tokenData.expiresAt).toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const isLoading = isLoadingToken || isFetching;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-dark bg-neutral p-3">
        <div className="flex items-center gap-2.5">
          <Eye className="size-4 text-primary" />
          <p className="text-sm font-medium text-primary">Vista previa del sitio de reservas</p>
          {expiresAtLabel && !isExpired && !isLoading && (
            <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-primary-light border border-neutral-dark">
              <Clock className="size-3" />
              Expira {expiresAtLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-dark bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "desktop" ? "bg-primary text-white" : "text-primary-light hover:text-primary",
              )}
            >
              <Monitor className="size-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "mobile" ? "bg-primary text-white" : "text-primary-light hover:text-primary",
              )}
            >
              <Smartphone className="size-3.5" />
              Mobile
            </button>
          </div>

          {/* Abrir en nueva pestaña */}
          {bookingBaseUrl && (
            <a
              href={iframeUrl ?? bookingBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-dark bg-white px-3 py-1.5 text-xs font-medium text-primary-light transition-colors hover:text-primary"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex justify-center">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border-4 border-neutral-dark bg-neutral shadow-xl transition-all duration-300",
            viewMode === "mobile" ? "h-[680px] w-[375px]" : "h-[600px] w-full",
          )}
        >
          {/* Loading token */}
          {isLoading && (
            <div className="flex size-full flex-col items-center justify-center gap-3 bg-neutral">
              <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-primary-light">Generando sesión de preview...</p>
            </div>
          )}

          {/* Token error */}
          {!isLoading && tokenError && (
            <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
              <AlertTriangle className="size-8 text-red-400" />
              <div>
                <p className="text-sm font-semibold text-primary">No se pudo generar el preview</p>
                <p className="mt-1 text-xs text-primary-light">
                  Verificá que tengas permisos y volvé a intentarlo.
                </p>
              </div>
              <Button size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Reintentar
              </Button>
            </div>
          )}

          {/* Token expirado */}
          {!isLoading && !tokenError && isExpired && (
            <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
              <Clock className="size-8 text-primary-light opacity-50" />
              <div>
                <p className="text-sm font-semibold text-primary">Sesión de preview expirada</p>
                <p className="mt-1 text-xs text-primary-light">
                  Los tokens de preview duran 15 minutos por seguridad.
                </p>
              </div>
              <Button size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Regenerar preview
              </Button>
            </div>
          )}

          {/* Iframe */}
          {!isLoading && !tokenError && !isExpired && iframeUrl && (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral">
                  <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-primary-light">Cargando sitio de reservas...</p>
                </div>
              )}
              <iframe
                key={iframeUrl}
                src={iframeUrl}
                className="size-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title={`Preview — ${tenantInfo?.name ?? "booking site"}`}
                onLoad={() => setIframeLoading(false)}
              />
            </>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-primary-light">
        Mostrando la configuración guardada actualmente.{" "}
        {tenantInfo?.published === false && (
          <span className="font-medium text-secondary">
            El sitio no está publicado — los clientes no pueden acceder todavía.
          </span>
        )}
      </p>
    </div>
  );
}
