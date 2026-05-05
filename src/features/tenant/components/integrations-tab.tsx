import { useEffect, useMemo } from "react";
import { Link2, RefreshCw, Unlink, CalendarDays } from "lucide-react";
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
import { toTenantFriendlyMessage } from "@/features/tenant/tenant-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { useFeedback } from "@/shared/notifications/use-feedback";
import { TransientFeedback } from "@/shared/ui/transient-feedback";
import { useNotifications } from "@/shared/notifications/notification-store";

export function IntegrationsTab() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const canView = canViewGoogleCalendarStatus(session.user?.role);
  const canManage = canManageGoogleCalendarConnection(session.user?.role);
  const { feedback, showFeedback, dismissFeedback } = useFeedback("system");
  const { addNotification } = useNotifications();

  const calendarStatusQuery = useQuery({
    queryKey: ["google-calendar", "auth-status"],
    queryFn: fetchGoogleCalendarAuthStatus,
    enabled: canView,
  });

  const calendarConnectionsQuery = useQuery({
    queryKey: ["google-calendar", "connections"],
    queryFn: fetchGoogleCalendarConnections,
    enabled: canView && calendarStatusQuery.data?.status === "ACTIVE",
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: async () => {
      showFeedback("success", "Google Calendar desconectado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "auth-status"] }),
        queryClient.invalidateQueries({ queryKey: ["google-calendar", "connections"] }),
      ]);
    },
    onError: (error) => {
      showFeedback("error", toTenantFriendlyMessage(error as unknown as AppError));
    },
  });

  useEffect(() => {
    if (!canView) {
      setGoogleCalendarAlertStatus("NONE");
      return;
    }
    const status = calendarStatusQuery.data?.status;
    if (!status) return;
    setGoogleCalendarAlertStatus(status === "NEEDS_REAUTH" ? "NEEDS_REAUTH" : "NONE");
  }, [calendarStatusQuery.data?.status, canView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const googleStatus = url.searchParams.get("google");
    const reason = url.searchParams.get("reason");
    if (!googleStatus) return;

    if (googleStatus === "connected") {
      showFeedback("success", "✅ Google Calendar conectado correctamente", { persist: false });
      addNotification({
        type: "success",
        title: "Google Calendar conectado",
        message: "Tu cuenta de Google fue conectada exitosamente. Los turnos se sincronizarán automáticamente.",
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
        google_error: "Google rechazó la conexión. Verificá que estés usando la cuenta del negocio.",
        invalid_state: "No pudimos validar el estado de seguridad de Google. Intentalo de nuevo.",
        server_error: "Hubo un error en el servidor. Intentalo en unos minutos.",
      };
      showFeedback("error", messages[reason ?? ""] ?? "No se pudo conectar con Google. Intentalo de nuevo.", { persist: false });
      addNotification({
        type: "warning",
        title: "Error al conectar Google Calendar",
        message: messages[reason ?? ""] ?? "No se pudo conectar con Google.",
        category: "system",
      });
    }

    url.searchParams.delete("google");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [addNotification, queryClient, showFeedback]);

  const connectedAtLabel = useMemo(() => {
    if (!calendarStatusQuery.data?.connectedAt) return null;
    return new Date(calendarStatusQuery.data.connectedAt).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [calendarStatusQuery.data?.connectedAt]);

  async function handleConnect() {
    try {
      const { authUrl } = await fetchGoogleCalendarAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      showFeedback("error", toTenantFriendlyMessage(error as unknown as AppError));
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "¿Desconectar Google Calendar? Los calendarios seguirán en tu cuenta de Google pero dejarán de sincronizarse.",
    );
    if (!confirmed) return;
    await disconnectMutation.mutateAsync();
  }

  const calendarStatus = calendarStatusQuery.data?.status;

  return (
    <div className="space-y-5">
      {feedback && <TransientFeedback feedback={feedback} onDismiss={dismissFeedback} />}

      <PageCard>
        <div className="flex items-center gap-3 border-b border-neutral-dark pb-4">
          <CalendarDays className="size-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-primary">Google Calendar</h2>
            <p className="text-xs text-primary-light">Sincronizá tus turnos automáticamente.</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {!canView && (
            <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
              <p className="text-sm text-primary-light">
                Esta integración solo es visible para administradores del tenant.
              </p>
            </div>
          )}

          {canView && calendarStatusQuery.isLoading && (
            <p className="text-sm text-primary-light">Cargando estado de integración...</p>
          )}

          {canView && calendarStatusQuery.isError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {toTenantFriendlyMessage(calendarStatusQuery.error as unknown as AppError)}
            </p>
          )}

          {canView && !calendarStatusQuery.isLoading && !calendarStatusQuery.isError && (
            <>
              {calendarStatus === "ACTIVE" && (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="mt-0.5 size-2 shrink-0 rounded-full bg-green-500 ring-2 ring-green-200" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Conectado{connectedAtLabel ? ` desde ${connectedAtLabel}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm text-green-700">
                        {calendarConnectionsQuery.data?.length ?? 0} calendarios activos sincronizándose.
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unlink className="mr-2 size-4" />
                      {disconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
                    </Button>
                  ) : (
                    <p className="text-xs text-primary-light">Solo un TENANT_ADMIN puede desconectar esta integración.</p>
                  )}
                </>
              )}

              {calendarStatus === "NEEDS_REAUTH" && (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Conexión expirada</p>
                    <p className="mt-1 text-sm text-amber-800">Necesitás reconectar tu cuenta de Google.</p>
                  </div>
                  {canManage ? (
                    <Button onClick={handleConnect}>
                      <RefreshCw className="mr-2 size-4" />
                      Reconectar con Google
                    </Button>
                  ) : (
                    <p className="text-xs text-primary-light">Solo un TENANT_ADMIN puede reconectar la integración.</p>
                  )}
                </>
              )}

              {calendarStatus === "NOT_CONNECTED" && (
                <>
                  <div className="rounded-lg border border-neutral-dark bg-neutral p-4">
                    <p className="text-sm font-semibold text-primary">Sin conectar</p>
                    <p className="mt-1 text-sm text-primary-light">
                      Conectá tu cuenta de Gmail para sincronizar turnos automáticamente con Google Calendar.
                    </p>
                  </div>
                  {canManage ? (
                    <Button onClick={handleConnect}>
                      <Link2 className="mr-2 size-4" />
                      Conectar con Google
                    </Button>
                  ) : (
                    <p className="text-xs text-primary-light">Solo un TENANT_ADMIN puede conectar la integración.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </PageCard>
    </div>
  );
}
