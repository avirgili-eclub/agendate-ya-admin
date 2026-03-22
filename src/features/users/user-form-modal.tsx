import { useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import { toUsersFriendlyMessage, type UserCreateInput } from "@/features/users/users-service";
import { Button } from "@/shared/ui/button";

type UserFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: UserCreateInput) => Promise<void>;
  error: AppError | null;
  isLoading: boolean;
};

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "operator", label: "Operador" },
  { value: "viewer", label: "Visualizador" },
];

export function UserFormModal({ isOpen, onClose, onSubmit, error, isLoading }: UserFormModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("operator");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      password,
    };

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

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-primary">
                Nombre <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.firstName ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Juan"
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-primary">
                Apellido <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.lastName ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
                placeholder="Pérez"
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
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
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)}
                className={`mt-1 w-full rounded-md border ${
                  fieldErrors.role ? "border-red-500" : "border-neutral-dark"
                } bg-white px-3 py-2 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light`}
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {fieldErrors.role && <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>}
            </div>

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
