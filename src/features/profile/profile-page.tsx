import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Save, User as UserIcon, Briefcase } from "lucide-react";

import { getSessionState, setSessionState } from "@/core/auth/session-store";
import { PageCard } from "@/shared/ui/page-card";
import { Button } from "@/shared/ui/button";
import { PasswordInput } from "@/shared/ui/password-input";
import {
  fetchCurrentResource,
  updateCurrentResource,
  updateCurrentUser,
  toProfileFriendlyMessage,
  type UpdateUserInput,
  type UpdateResourceInput,
} from "@/features/profile/profile-service";
import type { AppError } from "@/core/errors/app-error";

// ============================================================================
// User Profile Section
// ============================================================================

function UserProfileSection() {
  const session = getSessionState();
  const user = session.user;

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return (
      <PageCard>
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-red-100 p-2 text-red-700">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-primary">Datos de usuario no disponibles</h2>
            <p className="mt-1 text-sm text-primary-light">No se pudo cargar la información del usuario.</p>
          </div>
        </div>
      </PageCard>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const nextFullName = fullName.trim();
      const shouldUpdateName = nextFullName !== user.fullName;
      const shouldUpdatePassword = newPassword.trim().length > 0;

      if (shouldUpdatePassword && newPassword.length < 8) {
        setError("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }

      if (shouldUpdatePassword && !currentPassword.trim()) {
        setError("Para cambiar la contraseña, debes ingresar tu contraseña actual.");
        return;
      }

      if (shouldUpdatePassword && newPassword !== confirmNewPassword) {
        setError("La nueva contraseña y su confirmación no coinciden.");
        return;
      }

      const input: UpdateUserInput = {};
      if (shouldUpdateName) {
        input.fullName = nextFullName;
      }
      if (shouldUpdatePassword) {
        input.currentPassword = currentPassword;
        input.newPassword = newPassword;
      }

      const updatedUser = await updateCurrentUser(input);

      setSessionState({
        user: {
          ...user,
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          resourceId: updatedUser.resourceId,
        },
      });
      setFullName(updatedUser.fullName);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setError(null);
      setSuccess("Tus datos se actualizaron correctamente.");
    } catch (err) {
      const appError = err as AppError;
      setError(toProfileFriendlyMessage(appError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasNameChange = fullName.trim() !== user.fullName;
  const hasPasswordChange = newPassword.trim().length > 0;
  const isPasswordTooShort = hasPasswordChange && newPassword.length < 8;
  const isCurrentPasswordMissing = hasPasswordChange && !currentPassword.trim();
  const isPasswordConfirmationMismatch =
    hasPasswordChange && confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  const canSubmit =
    !isSubmitting &&
    (hasNameChange || hasPasswordChange) &&
    !isPasswordTooShort &&
    !isCurrentPasswordMissing &&
    !isPasswordConfirmationMismatch;

  return (
    <PageCard>
      <div className="flex items-center gap-2 border-b border-neutral-dark pb-3">
        <UserIcon className="size-5 text-primary" />
        <h2 className="text-lg font-semibold text-primary">Mis datos</h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-primary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-md border border-neutral-dark bg-neutral px-3 py-2 text-sm text-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-primary">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-neutral disabled:text-primary-light"
          />
        </div>

        <div className="rounded-lg border border-neutral-dark/60 bg-neutral p-3">
          <p className="mb-3 text-sm font-medium text-primary">Cambiar contraseña (opcional)</p>

          <div className="space-y-3">
            <div>
              <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-primary">
                Contraseña actual
              </label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-10 disabled:bg-neutral disabled:text-primary-light"
                autoComplete="current-password"
              />
              {isCurrentPasswordMissing ? (
                <p className="mt-1 text-xs text-red-700">Debes ingresar tu contraseña actual para cambiarla.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-primary">
                Nueva contraseña
              </label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-10 disabled:bg-neutral disabled:text-primary-light"
                autoComplete="new-password"
              />
              {isPasswordTooShort ? (
                <p className="mt-1 text-xs text-red-700">La nueva contraseña debe tener al menos 8 caracteres.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium text-primary">
                Confirmar nueva contraseña
              </label>
              <PasswordInput
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmNewPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-10 disabled:bg-neutral disabled:text-primary-light"
                autoComplete="new-password"
              />
              {isPasswordConfirmationMismatch ? (
                <p className="mt-1 text-xs text-red-700">La nueva contraseña y su confirmación no coinciden.</p>
              ) : null}
            </div>
          </div>
        </div>

        {success && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit || !fullName.trim()} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </PageCard>
  );
}

// ============================================================================
// Resource Profile Section
// ============================================================================

function ResourceProfileSection({ resourceId }: { resourceId: string }) {
  const queryClient = useQueryClient();

  const resourceQuery = useQuery({
    queryKey: ["profile-resource", resourceId],
    queryFn: () => fetchCurrentResource(resourceId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateResourceInput) => updateCurrentResource(resourceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile-resource", resourceId] });
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceQuery.data) {
      return;
    }

    setName(resourceQuery.data.name);
    setDescription(resourceQuery.data.description ?? "");
    setCapacity(resourceQuery.data.capacity?.toString() ?? "");
    setActive(resourceQuery.data.active);
  }, [resourceQuery.data]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const input: UpdateResourceInput = {
        name,
        description: description.trim() || undefined,
        capacity: capacity.trim() ? parseInt(capacity, 10) : null,
        active,
      };

      await updateMutation.mutateAsync(input);
    } catch (err) {
      setError(toProfileFriendlyMessage(err as AppError));
    }
  };

  if (resourceQuery.isLoading) {
    return (
      <PageCard className="animate-pulse">
        <div className="h-4 w-48 rounded bg-neutral-dark" />
        <div className="mt-4 space-y-3">
          <div className="h-10 w-full rounded bg-neutral-dark" />
          <div className="h-10 w-full rounded bg-neutral-dark" />
        </div>
      </PageCard>
    );
  }

  if (resourceQuery.isError || !resourceQuery.data) {
    return (
      <PageCard>
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-red-100 p-2 text-red-700">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-primary">No pudimos cargar tu perfil profesional</h2>
            <p className="mt-1 text-sm text-primary-light">Verifica tu conexión e intenta nuevamente.</p>
            <Button className="mt-3" variant="outline" onClick={() => void resourceQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <div className="flex items-center gap-2 border-b border-neutral-dark pb-3">
        <Briefcase className="size-5 text-primary" />
        <h2 className="text-lg font-semibold text-primary">Mi perfil profesional</h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="resource-name" className="mb-1 block text-sm font-medium text-primary">
            Nombre
          </label>
          <input
            id="resource-name"
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            disabled={updateMutation.isPending}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-neutral disabled:text-primary-light"
          />
        </div>

        <div>
          <label htmlFor="resource-description" className="mb-1 block text-sm font-medium text-primary">
            Descripción
          </label>
          <textarea
            id="resource-description"
            value={description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            disabled={updateMutation.isPending}
            rows={3}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-neutral disabled:text-primary-light"
          />
        </div>

        <div>
          <label htmlFor="resource-capacity" className="mb-1 block text-sm font-medium text-primary">
            Capacidad
          </label>
          <input
            id="resource-capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCapacity(e.target.value)}
            disabled={updateMutation.isPending}
            className="w-full rounded-md border border-neutral-dark bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-neutral disabled:text-primary-light"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="resource-active"
            type="checkbox"
            checked={active}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setActive(e.target.checked)}
            disabled={updateMutation.isPending}
            className="size-4 rounded border-neutral-dark text-primary focus:ring-primary-light"
          />
          <label htmlFor="resource-active" className="text-sm font-medium text-primary">
            Activo
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending || !name.trim()} className="gap-2">
            <Save className="size-4" />
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </PageCard>
  );
}

// ============================================================================
// Main Profile Page
// ============================================================================

export function ProfilePage() {
  const session = getSessionState();
  const user = session.user;
  const role = user?.role?.toUpperCase();
  const resourceId = user?.resourceId;

  // Only PROFESSIONAL role should access this page
  if (role !== "PROFESSIONAL") {
    return (
      <PageCard>
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-yellow-100 p-2 text-yellow-700">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-primary">Acceso restringido</h2>
            <p className="mt-1 text-sm text-primary-light">Esta página solo está disponible para usuarios con rol PROFESSIONAL.</p>
          </div>
        </div>
      </PageCard>
    );
  }

  if (!resourceId) {
    return (
      <PageCard>
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-red-100 p-2 text-red-700">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-primary">Perfil incompleto</h2>
            <p className="mt-1 text-sm text-primary-light">
              Tu usuario no tiene un recurso profesional asignado. Contacta al administrador.
            </p>
          </div>
        </div>
      </PageCard>
    );
  }

  return (
    <div className="space-y-6">
      <UserProfileSection />
      <ResourceProfileSection resourceId={resourceId} />
    </div>
  );
}
