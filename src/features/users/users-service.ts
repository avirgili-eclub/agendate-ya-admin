import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

export type UserItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  resourceId?: string;
};

export type UserCreateInput = {
  email: string;
  name: string;
  role: string;
  password: string;
  resourceId?: string;
};

export type RoleOption = {
  value: string;
  label: string;
};

type DataEnvelope<T> = { data: T };

type ApiUser = {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  resourceId?: string;
};

function mapApiUserToItem(api: ApiUser): UserItem {
  // Prefer 'name' from backend; fallback to compose from legacy firstName/lastName
  const name = api.name ?? `${api.firstName ?? ""} ${api.lastName ?? ""}`.trim();

  return {
    id: api.id,
    email: api.email,
    name,
    role: api.role,
    active: api.active,
    createdAt: api.createdAt,
    lastLoginAt: api.lastLoginAt ?? undefined,
    resourceId: api.resourceId,
  };
}

function assertUserCreateInput(input: UserCreateInput) {
  const details: Array<{ field: string; message: string }> = [];
  const normalizedRole = input.role.trim().toUpperCase();
  
  if (!input.email.trim()) {
    details.push({ field: "email", message: "El email es obligatorio." });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    details.push({ field: "email", message: "El email no es válido." });
  }
  
  if (!input.name.trim()) {
    details.push({ field: "name", message: "El nombre es obligatorio." });
  }
  
  if (!input.password.trim()) {
    details.push({ field: "password", message: "La contraseña es obligatoria." });
  } else if (input.password.length < 8) {
    details.push({ field: "password", message: "La contraseña debe tener al menos 8 caracteres." });
  }
  
  if (!input.role.trim()) {
    details.push({ field: "role", message: "El rol es obligatorio." });
  }

  if (normalizedRole === "PROFESSIONAL" && !input.resourceId?.trim()) {
    details.push({ field: "resourceId", message: "El recurso es obligatorio para el rol PROFESSIONAL." });
  }
  
  if (details.length > 0) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details,
    });
  }
}

export async function fetchUsers(): Promise<UserItem[]> {
  const response = await httpRequest<DataEnvelope<ApiUser[]>>("/users");
  return unwrapData<ApiUser[]>(response).map(mapApiUserToItem);
}

export async function fetchUserRoles(): Promise<RoleOption[]> {
  const response = await httpRequest<DataEnvelope<string[]>>("/users/roles");
  const roles = unwrapData<string[]>(response);
  return roles.map((role) => ({ value: role, label: getRoleLabel(role) }));
}

export async function createUser(input: UserCreateInput): Promise<UserItem> {
  assertUserCreateInput(input);

  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
  };

  if (input.resourceId) {
    payload.resourceId = input.resourceId;
  }

  const response = await httpRequest<DataEnvelope<ApiUser>>("/users", {
    method: "POST",
    body: payload,
  });

  return mapApiUserToItem(unwrapData<ApiUser>(response));
}

export async function deactivateUser(id: string): Promise<void> {
  await httpRequest(`/users/${id}`, {
    method: "DELETE",
  });
}

export function toUsersFriendlyMessage(error: AppError): string {
  if (error.status === 409) {
    return "Ya existe un usuario con este email. Por favor, usa otro email.";
  }

  if (error.code === "FORBIDDEN") {
    return "No tienes permisos para realizar esta acción. Solo administradores pueden gestionar usuarios.";
  }

  if (error.code === "NOT_FOUND") {
    return "Usuario no encontrado.";
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    return error.details.map((d) => d.message).join(" ");
  }

  return error.message ?? "Ocurrió un error inesperado.";
}

export function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    TENANT_ADMIN: "Administrador del Negocio",
    LOCATION_MANAGER: "Gerente de Ubicación",
    PROFESSIONAL: "Profesional",
    admin: "Administrador",
    manager: "Gerente",
    operator: "Operador",
    viewer: "Visualizador",
  };
  return roleLabels[role] ?? roleLabels[role.toUpperCase()] ?? role;
}

