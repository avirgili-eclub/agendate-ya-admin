import { useState } from "react";
import { Plus, UserCircle, Mail, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchUsers,
  createUser,
  deactivateUser,
  toUsersFriendlyMessage,
  getRoleLabel,
  type UserItem,
  type UserCreateInput,
} from "@/features/users/users-service";
import { Button } from "@/shared/ui/button";
import { PageCard } from "@/shared/ui/page-card";
import { StatusChip } from "@/shared/ui/status-chip";
import { UserFormModal } from "@/features/users/user-form-modal";
import { LoadingState } from "@/shared/ui/loading-state";
import { ErrorState } from "@/shared/ui/error-state";
import { EmptyState } from "@/shared/ui/empty-state";
import { FeedbackBanner } from "@/shared/ui/feedback-banner";

export function UsersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<UserItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsFormOpen(false);
      setFeedback({ tone: "success", message: "Usuario creado correctamente." });
    },
    onError: (error) => {
      setFeedback({ tone: "error", message: toUsersFriendlyMessage(error as unknown as AppError) });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmDeactivate(null);
      setFeedback({ tone: "success", message: "Usuario desactivado correctamente." });
    },
    onError: (error) => {
      setFeedback({ tone: "error", message: toUsersFriendlyMessage(error as unknown as AppError) });
    },
  });

  const handleCreateUser = async (input: UserCreateInput) => {
    await createMutation.mutateAsync(input);
  };

  const handleDeactivate = (user: UserItem) => {
    setConfirmDeactivate(user);
  };

  const handleConfirmDeactivate = async () => {
    if (confirmDeactivate) {
      await deactivateMutation.mutateAsync(confirmDeactivate.id);
    }
  };

  const activeUsers = users.filter((u) => u.active);
  const inactiveUsers = users.filter((u) => !u.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Equipo</h1>
          <p className="mt-1 text-sm text-primary-light">
            Gestiona los usuarios del sistema y sus permisos de acceso.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <Plus className="size-4" />
          Nuevo Usuario
        </Button>
      </header>

      {feedback && <FeedbackBanner tone={feedback.tone} message={feedback.message} />}

      {/* Error State */}
      {error && (
        <ErrorState
          title="Error al cargar usuarios"
          message={toUsersFriendlyMessage(error as unknown as AppError)}
          onRetry={() => void queryClient.invalidateQueries({ queryKey: ["users"] })}
        />
      )}

      {/* Loading State */}
      {isLoading && <LoadingState message="Cargando usuarios..." />}

      {/* Empty State */}
      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          icon={UserCircle}
          title="Sin usuarios"
          description="Comienza agregando tu primer usuario del equipo."
        />
      )}

      {/* Active Users */}
      {!isLoading && !error && activeUsers.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-primary">Usuarios Activos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeUsers.map((user) => (
              <PageCard key={user.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                        <Mail className="size-3" />
                        {user.email}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                        <Shield className="size-3" />
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                    <StatusChip label="Activo" tone="success" />
                  </div>

                  {user.lastLoginAt && (
                    <div className="border-t border-neutral-dark pt-2 text-xs text-primary-light">
                      Último acceso:{" "}
                      {new Date(user.lastLoginAt).toLocaleDateString("es-PY", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-neutral-dark pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(user)}
                      className="flex-1"
                    >
                      Desactivar
                    </Button>
                  </div>
                </div>
              </PageCard>
            ))}
          </div>
        </section>
      )}

      {/* Inactive Users */}
      {!isLoading && !error && inactiveUsers.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-primary">Usuarios Inactivos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveUsers.map((user) => (
              <PageCard key={user.id} className="opacity-60">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                        <Mail className="size-3" />
                        {user.email}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-primary-light">
                        <Shield className="size-3" />
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                    <StatusChip label="Inactivo" tone="neutral" />
                  </div>

                  <div className="flex gap-2 border-t border-neutral-dark pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="flex-1"
                    >
                      Reactivación pendiente API
                    </Button>
                  </div>
                </div>
              </PageCard>
            ))}
          </div>
        </section>
      )}

      {/* User Form Modal */}
      {isFormOpen && (
        <UserFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            createMutation.reset();
          }}
          onSubmit={handleCreateUser}
          error={createMutation.error as AppError | null}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      {confirmDeactivate && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setConfirmDeactivate(null)}
            aria-hidden="true"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-xl border border-neutral-dark bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-8 text-secondary" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary">Desactivar Usuario</h3>
                <p className="mt-1 text-sm text-primary-light">
                  ¿Estás seguro de desactivar a{" "}
                  <strong>
                    {confirmDeactivate.firstName} {confirmDeactivate.lastName}
                  </strong>
                  ? Este usuario no podrá acceder al sistema hasta que sea reactivado.
                </p>
              </div>
            </div>

            {deactivateMutation.error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {toUsersFriendlyMessage(deactivateMutation.error as unknown as AppError)}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDeactivate(null)}
                disabled={deactivateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfirmDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
