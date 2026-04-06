import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Building2, Globe, Calendar, CreditCard, Edit, Save, X, Info, RefreshCw, Unlink, Link2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  canManageGoogleCalendarConnection,
  canViewGoogleCalendarStatus,
  disconnectGoogleCalendar,
  fetchGoogleCalendarAuthStatus,
  fetchGoogleCalendarAuthUrl,
  fetchGoogleCalendarConnections,
} from "@/features/calendar/google-calendar-service";
import { setGoogleCalendarAlertStatus } from "@/features/calendar/google-calendar-alert";
import {
  fetchTenantInfo,
  updateTenantInfo,
  toTenantFriendlyMessage,
  getTierLabel,
  getSubscriptionStatusLabel,
  type TenantUpdateInput,
} from "@/features/tenant/tenant-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { useNotifications } from "@/shared/notifications/notification-store";

const AVAILABLE_TIMEZONES = [
  { value: "America/Asuncion", label: "Paraguay (GMT-4)" },
  { value: "America/Buenos_Aires", label: "Argentina (GMT-3)" },
  { value: "America/Sao_Paulo", label: "Brasil (GMT-3)" },
  { value: "America/Santiago", label: "Chile (GMT-3)" },
  { value: "America/Montevideo", label: "Uruguay (GMT-3)" },
];

const BUSINESS_TYPES = [
  { value: "salon", label: "Salón de belleza" },
  { value: "spa", label: "Spa" },
  { value: "clinic", label: "Clínica médica" },
  { value: "gym", label: "Gimnasio" },
  { value: "restaurant", label: "Restaurante" },
  { value: "other", label: "Otro" },
];

export function TenantSettingsPage() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const canViewCalendarStatus = canViewGoogleCalendarStatus(session.user?.role);
  const canManageCalendarConnection = canManageGoogleCalendarConnection(session.user?.role);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const { addNotification } = useNotifications();

  const { data: tenantInfo, isLoading: isLoadingInfo, error: infoError } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
  });

  const calendarStatusQuery = useQuery({
    queryKey: ["google-calendar", "auth-status"],
    queryFn: fetchGoogleCalendarAuthStatus,
    enabled: canViewCalendarStatus,
  });

  const calendarConnectionsQuery = useQuery({
    queryKey: ["google-calendar", "connections"],
    queryFn: fetchGoogleCalendarConnections,
    enabled: canViewCalendarStatus && calendarStatusQuery.data?.status === "ACTIVE",
  });

  const hasSubscriptionData = Boolean(
    tenantInfo?.subscriptionTier ||
      tenantInfo?.subscriptionStatus ||
      tenantInfo?.maxLocations != null ||
      tenantInfo?.maxResources != null ||
      tenantInfo?.maxUsers != null ||
      tenantInfo?.maxBookingsPerMonth != null,
  );

  const updateMutation = useMutation({
    mutationFn: updateTenantInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-info"] });
      setIsEditing(false);
    },
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: async () => {
      showFeedback("success", "Google Calendar desconectado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "auth-status"] }),
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "connections"] }),
      ]);
    },
    onError: (error) => {
      showFeedback(
        "error",
        toTenantFriendlyMessage(error as unknown as AppError),
      );
    },
  });

  useEffect(() => {
    if (!canViewCalendarStatus) {
      setGoogleCalendarAlertStatus("NONE");
      return;
    }

    const status = calendarStatusQuery.data?.status;
    if (!status) {
      return;
    }

    setGoogleCalendarAlertStatus(status === "NEEDS_REAUTH" ? "NEEDS_REAUTH" : "NONE");
  }, [calendarStatusQuery.data?.status, canViewCalendarStatus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const googleStatus = currentUrl.searchParams.get("google");
    const reason = currentUrl.searchParams.get("reason");

    if (!googleStatus) {
      return;
    }

    if (googleStatus === "connected") {
      showFeedback("success", "✅ Google Calendar conectado correctamente", { persist: false });
      addNotification({
        type: "success",
        title: "Google Calendar conectado",
        message:
          "Tu cuenta de Google fue conectada exitosamente. Los turnos se sincronizarán automáticamente.",
        category: "system",
      });
      setGoogleCalendarAlertStatus("NONE");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "auth-status"] }),
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "connections"] }),
      ]);
    }

    if (googleStatus === "error") {
      const messages: Record<string, string> = {
        cancelled: "Cancelaste la conexión con Google. Podés intentarlo de nuevo.",
        google_error:
          "Google rechazó la conexión. Verificá que estés usando la cuenta del negocio.",
        server_error: "Hubo un error en el servidor. Intentalo en unos minutos.",
      };

      const message =
        reason
          ? (messages[reason] ?? "No se pudo conectar con Google. Intentalo de nuevo.")
          : "No se pudo conectar con Google. Intentalo de nuevo.";

      showFeedback("error", message, { persist: false });
      addNotification({
        type: "warning",
        title: "Error al conectar Google Calendar",
        message,
        category: "system",
      });
    }

    currentUrl.searchParams.delete("google");
    currentUrl.searchParams.delete("reason");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [addNotification, queryClient, showFeedback]);

  const calendarConnectedAtLabel = useMemo(() => {
    if (!calendarStatusQuery.data?.connectedAt) {
      return null;
    }

    return new Date(calendarStatusQuery.data.connectedAt).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [calendarStatusQuery.data?.connectedAt]);

  async function handleConnectGoogleCalendar() {
    try {
      const response = await fetchGoogleCalendarAuthUrl();
      window.location.href = response.authUrl;
    } catch (error) {
      showFeedback(
        "error",
        toTenantFriendlyMessage(error as unknown as AppError),
      );
    }
  }

  async function handleDisconnectGoogleCalendar() {
    const confirmed = window.confirm(
      "¿Desconectar Google Calendar? Los calendarios seguirán en tu cuenta de Google pero dejarán de sincronizarse.",
    );

    if (!confirmed) {
      return;
    }

    await disconnectGoogleCalendarMutation.mutateAsync();
  }

  const handleStartEdit = () => {
    if (tenantInfo) {
      setName(tenantInfo.name);
      setTimezone(tenantInfo.timezone ?? "");
      setBusinessType(tenantInfo.businessType ?? "");
      setIsEditing(true);
    }
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
      businessType: businessType || undefined,
    };

    await updateMutation.mutateAsync(input);
  };

  const getSubscriptionStatusTone = (status: string): "success" | "warning" | "neutral" | "danger" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "active") return "success";
    if (lowerStatus === "trialing") return "warning";
    if (lowerStatus === "past_due" || lowerStatus === "canceled") return "danger";
    return "neutral";
  };

  const calculateUsagePercentage = (current: number, max: number): number => {
    if (max === 0) return 0;
    return Math.min(100, (current / max) * 100);
  };

  return (
    <div className="space-y-6">
      {feedback ? <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} /> : null}

      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold text-primary">Configuración</h1>
        <p className="mt-1 text-sm text-primary-light">
          Ajusta la configuración de tu cuenta y preferencias del sistema.
        </p>
      </header>

      {/* Error State */}
      {infoError && (
        <PageCard>
          <div className="text-center text-sm text-red-600">
            {toTenantFriendlyMessage(infoError as unknown as AppError)}
          </div>
        </PageCard>
      )}

      {/* Loading State */}
      {isLoadingInfo && (
        <PageCard>
          <div className="text-center text-sm text-primary-light">Cargando configuración...</div>
        </PageCard>
      )}

      {/* General Information Section */}
      {!isLoadingInfo && !infoError && tenantInfo && (
        <PageCard>
          <div className="flex items-center justify-between border-b border-neutral-dark pb-4">
            <div className="flex items-center gap-3">
              <Building2 className="size-6 text-primary" />
              <h2 className="text-lg font-semibold text-primary">Información General</h2>
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
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Nombre del Negocio
                </label>
                <p className="mt-1 text-sm font-semibold text-primary">{tenantInfo.name}</p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Identificador (Slug)
                </label>
                <p className="mt-1 text-sm text-primary">{tenantInfo.slug}</p>
                <p className="mt-1 text-xs text-primary-light">
                  Este valor es de solo lectura y se usa en URLs del sistema.
                </p>
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

              {tenantInfo.businessType && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                    Tipo de Negocio
                  </label>
                  <p className="mt-1 text-sm text-primary">
                    {BUSINESS_TYPES.find((bt) => bt.value === tenantInfo.businessType)?.label ??
                      tenantInfo.businessType}
                  </p>
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
                <label htmlFor="name" className="block text-sm font-medium text-primary">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                  placeholder="Mi Negocio"
                />
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-primary">
                  Zona Horaria
                </label>
                <select
                  id="timezone"
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
                <label htmlFor="businessType" className="block text-sm font-medium text-primary">
                  Tipo de Negocio
                </label>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setBusinessType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
                >
                  <option value="">Selecciona un tipo</option>
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </select>
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
      )}

      {/* Availability Override Note */}
      <PageCard>
        <div className="flex items-start gap-3">
          <Info className="mt-1 size-5 text-primary" />
          <div>
            <h3 className="font-semibold text-primary">Disponibilidad por Local</h3>
            <p className="mt-1 text-sm text-primary-light">
              Recuerda que la disponibilidad configurada a nivel de local{" "}
              <strong>siempre tiene prioridad</strong> sobre la disponibilidad global. Si estableciste
              horarios específicos en un local, esos serán los que se apliquen para las reservas en
              ese lugar.
            </p>
            <p className="mt-2 text-xs text-primary-light">
              Para ajustar la disponibilidad, visita la sección{" "}
              <strong>Disponibilidad</strong> en el menú principal.
            </p>
          </div>
        </div>
      </PageCard>

      {/* Subscription Section */}
      {hasSubscriptionData && tenantInfo && (
        <PageCard>
          <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
            <CreditCard className="size-6 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Suscripción</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                  Plan Actual
                </label>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {getTierLabel(tenantInfo.subscriptionTier ?? "basic")}
                </p>
              </div>
              <StatusChip
                label={getSubscriptionStatusLabel(tenantInfo.subscriptionStatus ?? "active")}
                tone={getSubscriptionStatusTone(tenantInfo.subscriptionStatus ?? "active")}
              />
            </div>

            {/* Usage Metrics */}
            <div className="border-t border-neutral-dark pt-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">Uso del Plan</h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Locales",
                    current: tenantInfo.currentLocations ?? 0,
                    max: tenantInfo.maxLocations ?? 0,
                  },
                  {
                    label: "Equipos",
                    current: tenantInfo.currentResources ?? 0,
                    max: tenantInfo.maxResources ?? 0,
                  },
                  {
                    label: "Usuarios",
                    current: tenantInfo.currentUsers ?? 0,
                    max: tenantInfo.maxUsers ?? 0,
                  },
                  {
                    label: "Turnos este mes",
                    current: tenantInfo.currentBookingsThisMonth ?? 0,
                    max: tenantInfo.maxBookingsPerMonth ?? 0,
                  },
                ].map((metric) => {
                  const percentage = calculateUsagePercentage(metric.current, metric.max);
                  const isNearLimit = percentage >= 80;

                  return (
                    <div key={metric.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-primary-light">{metric.label}</span>
                        <span className="font-medium text-primary">
                          {metric.current} / {metric.max}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-dark">
                        <div
                          className={`h-full transition-all ${
                            isNearLimit ? "bg-secondary" : "bg-primary"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </PageCard>
      )}

      {!hasSubscriptionData && tenantInfo && (
        <PageCard>
          <div className="text-center text-sm text-primary-light">
            Información de suscripción no disponible en este entorno todavía.
          </div>
        </PageCard>
      )}

      {canViewCalendarStatus && (
        <PageCard>
          <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
            <Link2 className="size-6 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Google Calendar</h2>
          </div>

          <div className="mt-4 space-y-4">
            {calendarStatusQuery.isLoading ? (
              <p className="text-sm text-primary-light">Estado: cargando integración...</p>
            ) : null}

            {calendarStatusQuery.isError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {toTenantFriendlyMessage(calendarStatusQuery.error as unknown as AppError)}
              </p>
            ) : null}

            {!calendarStatusQuery.isLoading && !calendarStatusQuery.isError && calendarStatusQuery.data?.status === "ACTIVE" ? (
              <>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Conectado{calendarConnectedAtLabel ? ` desde ${calendarConnectedAtLabel}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    {calendarConnectionsQuery.data?.length ?? 0} calendarios activos
                  </p>
                </div>

                {canManageCalendarConnection ? (
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                    onClick={handleDisconnectGoogleCalendar}
                    disabled={disconnectGoogleCalendarMutation.isPending}
                  >
                    <Unlink className="mr-2 size-4" />
                    {disconnectGoogleCalendarMutation.isPending ? "Desconectando..." : "Desconectar"}
                  </Button>
                ) : (
                  <p className="text-xs text-primary-light">
                    Solo un TENANT_ADMIN puede desconectar esta integración.
                  </p>
                )}
              </>
            ) : null}

            {!calendarStatusQuery.isLoading && !calendarStatusQuery.isError && calendarStatusQuery.data?.status === "NEEDS_REAUTH" ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">Conexión expirada</p>
                  <p className="mt-1 text-sm text-amber-800">Necesitás reconectar tu cuenta de Google.</p>
                </div>

                {canManageCalendarConnection ? (
                  <Button onClick={handleConnectGoogleCalendar}>
                    <RefreshCw className="mr-2 size-4" />
                    Reconectar con Google
                  </Button>
                ) : (
                  <p className="text-xs text-primary-light">
                    Solo un TENANT_ADMIN puede reconectar la integración.
                  </p>
                )}
              </>
            ) : null}

            {!calendarStatusQuery.isLoading && !calendarStatusQuery.isError && calendarStatusQuery.data?.status === "NOT_CONNECTED" ? (
              <>
                <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
                  <p className="text-sm font-medium text-primary">Sin conectar</p>
                  <p className="mt-1 text-sm text-primary-light">
                    Conectá tu cuenta de Gmail para sincronizar turnos automáticamente con Google Calendar.
                  </p>
                </div>

                {canManageCalendarConnection ? (
                  <Button onClick={handleConnectGoogleCalendar}>
                    <Link2 className="mr-2 size-4" />
                    Conectar con Google
                  </Button>
                ) : (
                  <p className="text-xs text-primary-light">
                    Solo un TENANT_ADMIN puede conectar la integración.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </PageCard>
      )}
    </div>
  );
}
