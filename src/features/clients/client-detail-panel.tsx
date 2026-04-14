import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Edit, User, Phone, Mail, MessageSquare } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { getSessionState } from "@/core/auth/session-store";
import {
  fetchClientById,
  toClientsFriendlyMessage,
  type ClientItem,
} from "@/features/clients/clients-service";
import { SidePanel } from "@/shared/ui/side-panel";
import { Button } from "@/shared/ui/button";
import { ClientChatHistory } from "@/features/clients/client-chat-history";
import { ClientBookingHistory } from "@/features/clients/client-booking-history";

type ClientDetailPanelProps = {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: ClientItem) => void;
};

type TabKey = "data" | "chat";

export function ClientDetailPanel({ clientId, isOpen, onClose, onEdit }: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const session = getSessionState();
  const currentRole = session.user?.role?.toUpperCase() ?? "";
  const isProfessional = currentRole === "PROFESSIONAL";

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClientById(clientId),
    enabled: isOpen,
  });

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
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "border-primary text-primary"
                  : "border-transparent text-primary-light hover:text-primary"
              }`}
            >
              <MessageSquare className="mr-2 inline-block size-4" />
              Chat histórico
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

              {/* Booking History */}
              <section>
                <h3 className="mb-4 text-lg font-semibold text-primary">Historial de Turnos</h3>
                <ClientBookingHistory clientId={clientId} isActive={isOpen && activeTab === "data"} />
              </section>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && <ClientChatHistory clientId={clientId} />}
        </div>
      )}
    </SidePanel>
  );
}
