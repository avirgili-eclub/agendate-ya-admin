import { useEffect, useState, type ChangeEvent } from "react";
import { Search, User, Phone, Mail, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  createClient,
  fetchClients,
  toClientsFriendlyMessage,
  type ClientItem,
  type ClientUpsertInput,
  updateClient,
} from "@/features/clients/clients-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { ClientDetailPanel } from "@/features/clients/client-detail-panel";
import { ClientFormModal } from "@/features/clients/client-form-modal";

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const isShortSearch = debouncedSearch.length > 0 && debouncedSearch.length < 3;
  const shouldUseServerSearch = debouncedSearch.length >= 3;

  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", { page, size: pageSize, search: shouldUseServerSearch ? debouncedSearch : "" }],
    queryFn: () =>
      fetchClients({
        page,
        size: pageSize,
        ...(shouldUseServerSearch ? { search: debouncedSearch } : {}),
      }),
    enabled: !isShortSearch,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (input: ClientUpsertInput) => createClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setFormMode(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientUpsertInput }) => updateClient(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      setFormMode(null);
      setEditingClient(null);
    },
  });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(0);
  };

  const handleOpenEdit = (client: ClientItem) => {
    setEditingClient(client);
    setFormMode("edit");
  };

  const handleFormSubmit = async (input: ClientUpsertInput) => {
    if (formMode === "create") {
      await createMutation.mutateAsync(input);
    } else if (formMode === "edit" && editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, input });
    }
  };

  const handleCloseForm = () => {
    setFormMode(null);
    setEditingClient(null);
    createMutation.reset();
    updateMutation.reset();
  };

  const clients = isShortSearch ? [] : (data?.clients ?? []);
  const total = isShortSearch ? 0 : (data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const formError = formMode === "create" ? createMutation.error : updateMutation.error;
  const isFormLoading = formMode === "create" ? createMutation.isPending : updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Clientes</h1>
          <p className="mt-1 text-sm text-primary-light">
            Gestiona tu base de clientes, historial de turnos y comunicaciones.
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setFormMode("create")}
        >
          Alta de cliente
        </Button>
      </header>

      {/* Search and Filter */}
      <PageCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-light" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-neutral-dark bg-white py-2 pl-10 pr-4 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
            />
            {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
              <p className="mt-2 text-xs text-primary-light">
                Escribe al menos 3 caracteres para buscar.
              </p>
            )}
          </div>
        </div>
      </PageCard>

      {/* Error State */}
      {error && (
        <PageCard>
          <div className="text-center text-sm text-red-600">
            {toClientsFriendlyMessage(error as unknown as AppError)}
          </div>
        </PageCard>
      )}

      {/* Loading State */}
      {isLoading && (
        <PageCard>
          <div className="text-center text-sm text-primary-light">Cargando clientes...</div>
        </PageCard>
      )}

      {/* Empty State */}
      {!isLoading && !error && clients.length === 0 && (
        <PageCard>
          <div className="py-12 text-center">
            <User className="mx-auto size-12 text-neutral-dark" />
            <h3 className="mt-4 text-base font-semibold text-primary">No hay clientes</h3>
            <p className="mt-2 text-sm text-primary-light">
              {shouldUseServerSearch
                ? "No se encontraron clientes con los criterios especificados."
                : "Aún no hay clientes registrados en el tenant."}
            </p>
          </div>
        </PageCard>
      )}

      {/* Clients Grid */}
      {!isLoading && !error && clients.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="cursor-pointer"
              onClick={() => setSelectedClientId(client.id)}
            >
              <PageCard className="transition-shadow hover:shadow-md">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">
                      {client.fullName}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                      <Phone className="size-3" />
                      {client.phone}
                    </div>
                    {client.email && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                        <Mail className="size-3" />
                        {client.email}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-neutral-dark pt-3 text-xs text-primary-light">
                  <Calendar className="size-3" />
                  <span>{client.totalBookings} turnos completados</span>
                  {client.lastBookingDate && (
                    <span className="ml-auto">
                      Último: {new Date(client.lastBookingDate).toLocaleDateString("es-PY")}
                    </span>
                  )}
                </div>
              </div>
            </PageCard>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && total > 0 && (
        <PageCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-primary-light">
              Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, total)} de {total} clientes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-primary" aria-current="page">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* Client Detail Panel */}
      {selectedClientId && (
        <ClientDetailPanel
          clientId={selectedClientId}
          isOpen={!!selectedClientId}
          onClose={() => setSelectedClientId(null)}
          onEdit={handleOpenEdit}
        />
      )}

      {/* Client Form Modal */}
      {formMode && (
        <ClientFormModal
          mode={formMode}
          initialClient={editingClient ?? undefined}
          isOpen={!!formMode}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          error={formError as AppError | null}
          isLoading={isFormLoading}
        />
      )}
    </div>
  );
}
