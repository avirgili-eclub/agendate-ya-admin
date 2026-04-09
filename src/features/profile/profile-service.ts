import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";

// ============================================================================
// Types
// ============================================================================

export type ProfileResource = {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  capacity?: number;
  active: boolean;
};

export type ProfileUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  resourceId?: string;
};

export type UpdateUserInput = {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
};

export type UpdateResourceInput = {
  name: string;
  description?: string;
  capacity?: number | null;
  active: boolean;
};

type DataEnvelope<T> = { data: T };

type ApiResource = {
  id: string;
  locationId: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  active: boolean;
};

type UpdateResourceDTO = {
  name: string;
  description: string | null;
  capacity: number | null;
  active: boolean;
};

type UpdateUserDTO = {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
};

type ApiMeUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  resourceId?: string;
};

// ============================================================================
// Resource API
// ============================================================================

export async function fetchCurrentResource(resourceId: string): Promise<ProfileResource> {
  const response = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${resourceId}`);
  const resource = unwrapData<ApiResource>(response);

  return {
    id: resource.id,
    locationId: resource.locationId,
    name: resource.name,
    description: resource.description ?? undefined,
    capacity: resource.capacity ?? undefined,
    active: resource.active,
  };
}

export async function updateCurrentResource(
  resourceId: string,
  input: UpdateResourceInput,
): Promise<void> {
  const payload: UpdateResourceDTO = {
    name: input.name,
    description: input.description ?? null,
    capacity: input.capacity ?? null,
    active: input.active,
  };

  await httpRequest<unknown>(`/resources/${resourceId}`, {
    method: "PUT",
    body: payload,
  });
}

// ============================================================================
// User API (with graceful degradation)
// ============================================================================

export async function updateCurrentUser(input: UpdateUserInput): Promise<ProfileUser> {
  const payload: UpdateUserDTO = {};

  if (input.fullName !== undefined) {
    const normalizedFullName = input.fullName.trim();
    if (!normalizedFullName) {
      throw toAppError({
        status: 400,
        code: "FULL_NAME_BLANK",
        message: "El nombre no puede estar vacío.",
      });
    }
    payload.fullName = normalizedFullName;
  }

  if (input.newPassword !== undefined) {
    if (!input.currentPassword) {
      throw toAppError({
        status: 400,
        code: "CURRENT_PASSWORD_REQUIRED",
        message: "Debes ingresar la contraseña actual para cambiar la contraseña.",
      });
    }
    payload.currentPassword = input.currentPassword;
    payload.newPassword = input.newPassword;
  }

  if (!payload.fullName && !payload.newPassword) {
    throw toAppError({
      status: 400,
      code: "NO_UPDATABLE_FIELDS",
      message: "No hay campos para actualizar.",
    });
  }

  const response = await httpRequest<DataEnvelope<ApiMeUser>>("/me", {
    method: "PATCH",
    body: payload,
  });

  const updated = unwrapData<ApiMeUser>(response);
  return {
    id: updated.id,
    email: updated.email,
    fullName: updated.fullName,
    role: updated.role,
    resourceId: updated.resourceId,
  };
}

// ============================================================================
// Error Mapping
// ============================================================================

export function toProfileFriendlyMessage(error: AppError): string {
  const code = `${error.code ?? ""}`;

  if (code === "NO_UPDATABLE_FIELDS") {
    return "Debes modificar el nombre o cargar una nueva contraseña.";
  }
  if (code === "FULL_NAME_BLANK") {
    return "El nombre completo no puede quedar vacío.";
  }
  if (code === "CURRENT_PASSWORD_REQUIRED") {
    return "Para cambiar la contraseña, debes ingresar tu contraseña actual.";
  }
  if (code === "CURRENT_PASSWORD_INCORRECT") {
    return "La contraseña actual es incorrecta.";
  }
  if (code === "PASSWORD_SAME_AS_CURRENT") {
    return "La nueva contraseña debe ser diferente a la actual.";
  }
  if (error.status === 401) {
    return "Tu sesión expiró. Inicia sesión nuevamente.";
  }
  if (error.status === 403 || error.code === "FORBIDDEN") {
    return "No tienes permisos para modificar este perfil.";
  }
  if (error.status === 404 || error.code === "NOT_FOUND") {
    return "No se encontró el perfil solicitado.";
  }
  return "No pudimos guardar los cambios. Intenta nuevamente.";
}
