import type { AppError } from "@/core/errors/app-error";

/**
 * Generic error message mapping configuration for API errors.
 * Provides common defaults while allowing module-specific overrides.
 */
export type ErrorMapperConfig = {
  /**
   * Custom message for 404 NOT_FOUND errors.
   * @default "Recurso no encontrado."
   */
  notFound?: string;

  /**
   * Custom message for 409 conflicts when field-specific detail is not available.
   * @default "Ya existe un registro con estos datos."
   */
  conflict?: string;

  /**
   * Field-specific conflict messages for 409 errors.
   * Example: { phone: "Ya existe un cliente con este teléfono." }
   */
  conflictFields?: Record<string, string>;

  /**
   * Custom message for validation errors when details are not present.
   * @default "Error de validación."
   */
  validationError?: string;

  /**
   * Fallback message for unexpected/unknown errors.
   * @default "Ocurrió un error inesperado."
   */
  fallback?: string;
};

const DEFAULT_CONFIG: Required<ErrorMapperConfig> = {
  notFound: "Recurso no encontrado.",
  conflict: "Ya existe un registro con estos datos.",
  conflictFields: {},
  validationError: "Error de validación.",
  fallback: "Ocurrió un error inesperado.",
};

/**
 * Creates a reusable error mapper function with module-specific configuration.
 * 
 * Usage:
 * ```ts
 * const toClientsFriendlyMessage = createErrorMapper({
 *   notFound: "Cliente no encontrado.",
 *   conflictFields: {
 *     phone: "Ya existe un cliente con este teléfono.",
 *     email: "Ya existe un cliente con este email.",
 *   },
 * });
 * ```
 * 
 * @param config - Module-specific error message overrides
 * @returns Error mapper function (AppError -> string)
 */
export function createErrorMapper(config: ErrorMapperConfig = {}): (error: AppError) => string {
  const mergedConfig: Required<ErrorMapperConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    conflictFields: { ...DEFAULT_CONFIG.conflictFields, ...config.conflictFields },
  };

  return (error: AppError): string => {
    // Handle 409 Conflict with field-specific messages
    if (error.status === 409 && error.details) {
      for (const detail of error.details) {
        if (detail.field && mergedConfig.conflictFields[detail.field]) {
          return mergedConfig.conflictFields[detail.field];
        }
      }
      return mergedConfig.conflict;
    }

    // Handle 404 Not Found
    if (error.code === "NOT_FOUND") {
      return mergedConfig.notFound;
    }

    // Handle validation errors with details
    if (error.code === "VALIDATION_ERROR" && error.details && error.details.length > 0) {
      return error.details.map((d) => d.message).join(" ");
    }

    // Handle validation error without details
    if (error.code === "VALIDATION_ERROR") {
      return mergedConfig.validationError;
    }

    // Fallback to error message or default
    return error.message ?? mergedConfig.fallback;
  };
}

/**
 * Helper to extract field-level validation errors from AppError.
 * Useful for mapping backend validation errors to form field errors.
 * 
 * @param error - AppError with optional details
 * @returns Record mapping field names to error messages
 */
export function extractFieldErrors(error: AppError): Record<string, string> {
  if (!error.details || !Array.isArray(error.details)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.field) {
      fieldErrors[detail.field] = detail.message;
    }
  }

  return fieldErrors;
}
