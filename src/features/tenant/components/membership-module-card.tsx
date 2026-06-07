import { ArrowUpRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getSessionState } from "@/core/auth/session-store";
import type { AppError } from "@/core/errors/app-error";
import { updateTenantSubscriptionsModule } from "@/features/tenant/tenant-capabilities-service";
import { toTenantFriendlyMessage } from "@/features/tenant/tenant-service";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";
import { PageCard } from "@/shared/ui/page-card";

export function MembershipModuleCard() {
  const queryClient = useQueryClient();
  const session = getSessionState();
  const userRole = (session.user?.role ?? "").toUpperCase();
  const canManageModule = userRole === "TENANT_ADMIN";
  const capabilitiesQuery = useTenantCapabilitiesQuery();

  const toggleModuleMutation = useMutation({
    mutationFn: (enabled: boolean) => updateTenantSubscriptionsModule(enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-capabilities"] });
    },
  });

  const subscriptionsCapabilities = capabilitiesQuery.data?.modes.subscriptions;
  const tierAllowsMemberships = subscriptionsCapabilities?.tierAllows ?? false;
  const enabledByTenant = subscriptionsCapabilities?.enabledByTenant ?? false;
  const membershipsEnabled =
    subscriptionsCapabilities?.enabled ?? (tierAllowsMemberships && enabledByTenant);
  const moduleToggleDisabled =
    !canManageModule || !tierAllowsMemberships || toggleModuleMutation.isPending || capabilitiesQuery.isLoading;

  async function handleToggleMembershipModule() {
    await toggleModuleMutation.mutateAsync(!membershipsEnabled);
  }

  return (
    <PageCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">
            Modulo de Membresias
          </p>
          <p className="mt-1 text-base font-semibold text-primary">
            {membershipsEnabled ? "Activado" : "Desactivado"}
          </p>
          <p className="mt-1 text-sm text-primary-light">
            {tierAllowsMemberships
              ? "Tu plan permite membresias. Activa el modulo para mostrarlo en el menu y configurar suscripciones."
              : "Tu plan actual no incluye membresias. Actualiza a PRO o ENTERPRISE para poder activarlo."}
          </p>
          {!canManageModule && (
            <p className="mt-1 text-xs text-primary-light">
              Solo un TENANT_ADMIN puede activar o desactivar este modulo.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => {
              void handleToggleMembershipModule();
            }}
            disabled={moduleToggleDisabled}
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light disabled:cursor-not-allowed disabled:opacity-50 ${
              membershipsEnabled
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {toggleModuleMutation.isPending
              ? "Guardando..."
              : membershipsEnabled
                ? "Desactivar modulo"
                : "Activar modulo"}
          </button>

          {!tierAllowsMemberships && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() =>
                window.open(
                  "mailto:hola@agendateya.app?subject=Quiero actualizar mi plan para habilitar membresias",
                  "_blank",
                )
              }
            >
              Upgrade de plan
              <ArrowUpRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {(capabilitiesQuery.isError || toggleModuleMutation.isError) && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toTenantFriendlyMessage(
            ((toggleModuleMutation.error ?? capabilitiesQuery.error) as unknown as AppError),
          )}
        </p>
      )}
    </PageCard>
  );
}
