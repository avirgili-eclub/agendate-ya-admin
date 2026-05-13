import type { AppError } from "@/core/errors/app-error";
import { createErrorMapper } from "@/shared/utils/api-error-mapper";

export type MembershipFriendlyError = {
  title: string;
  message: string;
};

const baseMembershipErrorMapper = createErrorMapper({
  notFound: "La membresia solicitada no existe o ya no esta disponible.",
  conflict: "No se pudo completar la operacion por un conflicto de negocio.",
  validationError: "Revisa los datos de la membresia.",
  fallback: "No pudimos procesar la operacion de membresias.",
});

export function getMembershipError(error: AppError): MembershipFriendlyError {
  if (error.status === 402 || error.code === "PAYMENT_REQUIRED" || error.code === "SUBSCRIPTION_LIMIT") {
    return {
      title: "Modulo no incluido",
      message: "Tu plan actual no incluye membresias. Actualiza el plan para activar esta funcion.",
    };
  }

  if (error.code === "SLOTS_REQUIRED_FOR_FIXED_PLAN") {
    return {
      title: "Faltan horarios fijos",
      message: "Este plan requiere que selecciones al menos un dia y horario fijo.",
    };
  }

  if (error.code === "SLOTS_NOT_ALLOWED_FOR_FLEXIBLE_PLAN") {
    return {
      title: "Horarios no permitidos",
      message: "Este plan es flexible. Quita los horarios seleccionados antes de continuar.",
    };
  }

  if (error.code === "SUBSCRIPTION_SLOT_FULL") {
    return {
      title: "Cupo lleno",
      message: "Ese horario ya esta completo. Elige otro dia, horario o recurso.",
    };
  }

  if (error.code === "SUBSCRIPTION_QUOTA_EXHAUSTED") {
    return {
      title: "Sin cupo del periodo",
      message: "La membresia ya consumio el cupo disponible para el periodo actual.",
    };
  }

  if (error.code === "PLAN_HAS_ACTIVE_SUBSCRIPTIONS") {
    return {
      title: "Plan en uso",
      message: "No puedes desactivar este plan porque tiene suscripciones activas.",
    };
  }

  if (error.code === "SUBSCRIPTION_NOT_FOUND" || error.status === 404) {
    return {
      title: "Membresia no encontrada",
      message: "La membresia ya no existe o no pertenece a este tenant.",
    };
  }

  return {
    title: "Error en membresias",
    message: baseMembershipErrorMapper(error),
  };
}

export function toMembershipsFriendlyMessage(error: AppError): string {
  return getMembershipError(error).message;
}
