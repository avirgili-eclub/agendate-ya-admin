import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AppError } from "@/core/errors/app-error";
import { toUsersFriendlyMessage, fetchUserRoles, type UserCreateInput } from "@/features/users/users-service";
import { useResourcesQuery } from "@/features/resources/use-resources-query";
import { Button } from "@/shared/ui/button";

type UserFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: UserCreateInput) => Promise<void>;
  error: AppError | null;
  isLoading: boolean;
};

export function UserFormModal({ isOpen, onClose, onSubmit, error, isLoading }: UserFormModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const rolesQuery = useQuery({
    queryKey: ["users", "roles"],
    queryFn: fetchUserRoles,
    enabled: isOpen,
    staleTime: 300_000, // 5 min
  });

  const resourcesQuery = useResourcesQuery({
    search: "",
    location: "Todas las ubicaciones",
    page: 0,
    pageSize: 100,
  });

  const availableRoles = rolesQuery.data ?? [];
  const availableResources = resourcesQuery.data?.data ?? [];
  const showResourceSelect = role.toUpperCase() === "PROFESSIONAL";

  useEffect(() => {
    if (!role && availableRoles.length > 0) {
      setRole(availableRoles[0].value);
    }
  }, [availableRoles, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Password confirmation check
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Las contraseñas no coinciden." });
      return;
    }

    const input: UserCreateInput = {
      email: email.trim(),
      name: name.trim(),
      role,
      password,
    };

    if (showResourceSelect && resourceId) {
      input.resourceId = resourceId;
    }

    try {
      await onSubmit(input);
    } catch (err) {
      const appError = err as AppError;
      if (appError.details) {
        const errors: Record<string, string> = {};
        appError.details.forEach((detail) => {
          if (detail.field) {
            errors[detail.field] = detail.message;
          }
        });
        setFieldErrors(errors);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-xl border border-neutral-dark bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-dark px-6 py-4">
          <h2 className="text-xl font-semibold text-primary">Nuevo Usuario</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-primary-light transition-colors hover:bg-neutral hover:text-primary"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Global Error */}
            {error && !error.details && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {toUsersFriendlyMessage(error)}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.email ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="usuario@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-primary">
                Nombre Completo <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.name ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Juan Pérez"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-primary">
                Rol <span className="text-red-600">*</span>
              </label>
              <select
                id="role"
                value={role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setRole(e.target.value);
                  setResourceId(""); // Clear resource when role changes
                }}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.role ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
              >
                <option value="">Selecciona un rol</option>
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {fieldErrors.role && <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>}
            </div>

            {/* Resource (only for PROFESSIONAL) */}
            {showResourceSelect && (
              <div>
                <label htmlFor="resourceId" className="block text-sm font-medium text-primary">
                  Recurso Asignado <span className="text-red-600">*</span>
                </label>
                <select
                  id="resourceId"
                  value={resourceId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setResourceId(e.target.value)}
                  className={`mt-1 w-full rounded-md border ${
                    fieldErrors.resourceId ? "border-red-500" : "border-neutral-dark"
                  } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                >
                  <option value="">Selecciona un recurso</option>
                  {availableResources
                    .filter((r) => r.type === "PROFESSIONAL")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.locationName})
                      </option>
                    ))}
                </select>
                {fieldErrors.resourceId && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.resourceId}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary">
                Contraseña <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.password ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Mínimo 8 caracteres"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary">
                Confirmar Contraseña <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.confirmPassword ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Confirma la contraseña"
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
