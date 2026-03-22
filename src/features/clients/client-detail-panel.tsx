import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Edit, User, Phone, Mail, Calendar, MessageSquare } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchClientById,
  fetchClientBookingHistory,
  toClientsFriendlyMessage,
  type ClientItem,
} from "@/features/clients/clients-service";
import { SidePanel } from "@/shared/ui/side-panel";
import { Button } from "@/shared/ui/button";
import { StatusChip } from "@/shared/ui/status-chip";
import { ClientChatHistory } from "@/features/clients/client-chat-history";

type ClientDetailPanelProps = {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: ClientItem) => void;
};

type TabKey = "data" | "chat";

export function ClientDetailPanel({ clientId, isOpen, onClose, onEdit }: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("data");

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClientById(clientId),
    enabled: isOpen,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ["client-bookings", clientId],
    queryFn: () => fetchClientBookingHistory(clientId, { size: 10 }),
    enabled: isOpen && activeTab === "data",
  });

  const bookings = bookingsData?.bookings ?? [];

  const handleEdit = () => {
    if (client) {
      onEdit(client);
    }
  };

  const getStatusTone = (status: string): "success" | "warning" | "neutral" | "danger" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "confirmed" || lowerStatus === "completed") return "success";
    if (lowerStatus === "pending") return "warning";
    if (lowerStatus === "cancelled" || lowerStatus === "no_show") return "danger";
    return "neutral";
  };

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Detalle del Cliente">
      {isLoading && (
        <div className="py-8 text-center text-sm text-primary-light">Cargando...</div>
      )}

      {error && (
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
                      {client.firstName} {client.lastName}
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
                </div>
              </section>

              {/* Booking History */}
              <section>
                <h3 className="mb-4 text-lg font-semibold text-primary">Historial de Turnos</h3>
                {bookings.length === 0 ? (
                  <div className="rounded-lg bg-neutral p-8 text-center">
                    <Calendar className="mx-auto size-8 text-neutral-dark" />
                    <p className="mt-3 text-sm text-primary-light">
                      No hay turnos registrados para este cliente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-lg border border-neutral-dark bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-primary">{booking.serviceName}</p>
                            {booking.resourceName && (
                              <p className="mt-1 text-xs text-primary-light">
                                Con: {booking.resourceName}
                              </p>
                            )}
                            {booking.locationName && (
                              <p className="mt-1 text-xs text-primary-light">
                                Lugar: {booking.locationName}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-primary-light">
                              {new Date(booking.scheduledAt).toLocaleDateString("es-PY", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}{" "}
                              {new Date(booking.scheduledAt).toLocaleTimeString("es-PY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <StatusChip label={booking.status} tone={getStatusTone(booking.status)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
