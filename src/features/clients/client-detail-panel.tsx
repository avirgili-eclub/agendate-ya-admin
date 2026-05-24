import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Edit, User, Phone, Mail, MessageSquare, MessageCircle, ReceiptText } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  fetchClientById,
  toClientsFriendlyMessage,
  type ClientItem,
} from "@/features/clients/clients-service";
import { fetchTenantInfo } from "@/features/tenant/tenant-service";
import { useTenantCapabilitiesQuery } from "@/features/tenant/use-tenant-capabilities-query";
import { SidePanel } from "@/shared/ui/side-panel";
import { Button } from "@/shared/ui/button";
import { ClientChatHistory } from "@/features/clients/client-chat-history";
import { ClientBookingHistory } from "@/features/clients/client-booking-history";
import { ClientMembershipSummary } from "@/features/clients/client-membership-summary";
import { createClientWhatsappUrl } from "@/shared/utils/booking-whatsapp";

type ClientDetailPanelProps = {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: ClientItem) => void;
  onBookingSelect: (bookingId: string) => void;
  onCreateMembership: (client: ClientItem) => void;
};

type TabKey = "data" | "membership" | "chat";

export function ClientDetailPanel({
  clientId,
  isOpen,
  onClose,
  onEdit,
  onBookingSelect,
  onCreateMembership,
}: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const isProfessional = currentRole === "PROFESSIONAL";

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClientById(clientId),
    enabled: isOpen,
  });
  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant-info"],
    queryFn: fetchTenantInfo,
    enabled: isOpen,
    staleTime: 60_000,
  });
  const capabilitiesQuery = useTenantCapabilitiesQuery();

  const clientError = error as unknown as AppError | undefined;
  const isSilentNotFound = isProfessional && clientError?.status === 404;

  // Silent 404 handling for PROFESSIONAL users
  useEffect(() => {
    if (isSilentNotFound) {
      onClose();
    }
  }, [isSilentNotFound, onClose]);

  const handleEdit = () => {
    if (client) {
      onEdit(client);
    }
  };

  const completedCount = client?.bookingSummary?.completedCount ?? client?.totalBookings ?? 0;
  const confirmedCount = client?.bookingSummary?.confirmedCount ?? 0;
  const noShowCount = client?.bookingSummary?.noShowCount ?? 0;
  const cancelledCount = client?.bookingSummary?.cancelledCount ?? 0;
  const completedAndConfirmedTotal = completedCount + confirmedCount;
  const missedRatePct = client?.bookingSummary?.missedRatePct ?? null;
  const tenantName = tenantInfo?.name ?? "AgendateYA";
  const subscriptions = capabilitiesQuery.data?.modes.subscriptions;
  const membershipsEnabled = subscriptions?.enabled ?? false;
  const hasBillingData = Boolean(
    client?.documentType ||
      client?.documento ||
      client?.dv ||
      client?.ruc ||
      client?.razonSocial ||
      client?.billingEmail,
  );
  const whatsappUrl = client
    ? createClientWhatsappUrl(client.fullName, client.phone, tenantName)
    : null;

  useEffect(() => {
    if (!membershipsEnabled && activeTab === "membership") {
      setActiveTab("data");
    }
  }, [membershipsEnabled, activeTab]);

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Detalle del Cliente">
      {isLoading && (
        <div className="py-8 text-center text-sm text-primary-light">Cargando...</div>
      )}

      {error && !isSilentNotFound && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {toClientsFriendlyMessage(error as unknown as AppError)}
        </div>
      )}

      {!isLoading && !error && client && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-neutral-dark">
            <button
              onClick={() => setActiveTab("data")}
              className={`flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "data"
                  ? "border-primary text-primary"
                  : "border-transparent text-primary-light hover:text-primary"
              }`}
            >
              <User className="mr-2 inline-block size-4" />
              Datos
            </button>
            {membershipsEnabled ? (
              <button
                onClick={() => setActiveTab("membership")}
                className={`flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "membership"
                    ? "border-primary text-primary"
                    : "border-transparent text-primary-light hover:text-primary"
                }`}
              >
                <BadgeCheck className="mr-2 inline-block size-4" />
                Membresia
              </button>
            ) : null}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "border-primary text-primary"
                  : "border-transparent text-primary-light hover:text-primary"
              }`}
            >
              <MessageSquare className="mr-2 inline-block size-4" />
              Chat
            </button>
          </div>

          {/* Data Tab */}
          {activeTab === "data" && (
            <div className="space-y-6">
              {/* Client Info */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Información Personal</h3>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit className="mr-2 size-4" />
                    Editar
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg bg-neutral p-4">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Nombre Completo
                    </label>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {client.fullName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Teléfono
                    </label>
                    <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                      <Phone className="size-4" />
                      {client.phone}
                      <button
                        type="button"
                        onClick={() => {
                          if (!whatsappUrl) return;
                          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                        }}
                        disabled={!whatsappUrl}
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:text-neutral-dark"
                        aria-label={`Enviar WhatsApp a ${client.fullName}`}
                        title={whatsappUrl ? "Enviar mensaje por WhatsApp" : "Cliente sin telefono"}
                      >
                        <MessageCircle className="size-3.5" />
                      </button>
                    </p>
                  </div>
                  {client.email && (
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                        Email
                      </label>
                      <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                        <Mail className="size-4" />
                        {client.email}
                      </p>
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                        Notas
                      </label>
                      <p className="mt-1 text-sm text-primary">{client.notes}</p>
                    </div>
                  )}
                  <div className="border-t border-neutral-dark pt-3">
                    <label className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Cliente desde
                    </label>
                    <p className="mt-1 text-sm text-primary">
                      {new Date(client.createdAt).toLocaleDateString("es-PY", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="border-t border-neutral-dark pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary-light">
                      Resumen de Turnos
                    </p>

                    {!client.bookingSummary ? (
                      <p className="mt-2 text-sm text-primary-light">
                        Sin datos suficientes para mostrar métricas de turnos.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-neutral-dark bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-primary-light">Completados</p>
                          <p className="mt-1 text-lg font-semibold text-primary">
                            {completedCount}
                            <span className="ml-1 text-sm font-medium text-primary-light">
                              / {completedAndConfirmedTotal}
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-primary-light">sobre completados + confirmados</p>
                        </div>

                        <div className="rounded-lg border border-neutral-dark bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-primary-light">No Show</p>
                          <p className="mt-1 text-lg font-semibold text-amber-700">{noShowCount}</p>
                          <p className="mt-1 text-[11px] text-primary-light">ausencias registradas</p>
                        </div>

                        <div className="rounded-lg border border-neutral-dark bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-primary-light">Cancelados</p>
                          <p className="mt-1 text-lg font-semibold text-primary">{cancelledCount}</p>
                          <p className="mt-1 text-[11px] text-primary-light">turnos cancelados</p>
                        </div>

                        <div className="rounded-lg border border-neutral-dark bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-primary-light">Tasa de inasistencia</p>
                          <p className="mt-1 text-lg font-semibold text-primary">
                            {missedRatePct === null ? "-" : `${missedRatePct.toFixed(1)}%`}
                          </p>
                          <p className="mt-1 text-[11px] text-primary-light">
                            {missedRatePct === null ? "sin historial suficiente" : "no-show + cancelados"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>


              {/* Billing Info */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Datos de Facturacion</h3>
                  {hasBillingData ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Completo o parcial
                    </span>
                  ) : null}
                </div>
                <div className="rounded-lg bg-neutral p-4">
                  {hasBillingData ? (
                    <div className="grid grid-cols-1 gap-3 text-sm text-primary sm:grid-cols-2">
                      {client.documentType ? (
                        <div>
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">Tipo</label>
                          <p className="mt-1">{client.documentType}</p>
                        </div>
                      ) : null}
                      {client.documento ? (
                        <div>
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">Documento</label>
                          <p className="mt-1">{client.documento}</p>
                        </div>
                      ) : null}
                      {client.dv ? (
                        <div>
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">DV</label>
                          <p className="mt-1">{client.dv}</p>
                        </div>
                      ) : null}
                      {client.ruc ? (
                        <div>
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">RUC</label>
                          <p className="mt-1">{client.ruc}</p>
                        </div>
                      ) : null}
                      {client.razonSocial ? (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">Razon social</label>
                          <p className="mt-1">{client.razonSocial}</p>
                        </div>
                      ) : null}
                      {client.billingEmail ? (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium uppercase tracking-wide text-primary-light">Email de facturacion</label>
                          <p className="mt-1">{client.billingEmail}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 text-sm text-primary-light">
                      <ReceiptText className="mt-0.5 size-4 shrink-0" />
                      <p>Sin datos de facturacion cargados. Usa Editar para completar los datos opcionales del cliente.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Booking History */}
              <section>
                <h3 className="mb-4 text-lg font-semibold text-primary">Historial de Turnos</h3>
                <ClientBookingHistory
                  clientId={clientId}
                  isActive={isOpen && activeTab === "data"}
                  onBookingSelect={onBookingSelect}
                />
              </section>
            </div>
          )}

          {/* Membership Tab */}
          {membershipsEnabled && activeTab === "membership" && (
            <ClientMembershipSummary
              client={client}
              isActive={isOpen && activeTab === "membership"}
              onCreateMembership={onCreateMembership}
            />
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && <ClientChatHistory clientId={clientId} />}
        </div>
      )}
    </SidePanel>
  );
}
