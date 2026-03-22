import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { toAppError, type AppError } from "@/core/errors/app-error";
import { createErrorMapper, extractFieldErrors } from "@/shared/utils/api-error-mapper";

export type ResourceCardItem = {
  id: string;
  locationId: string;
  name: string;
  locationName: string;
  type: "PROFESSIONAL" | "TABLE" | "ROOM" | "EQUIPMENT";
  serviceIds: string[];
  services: string[];
  active: boolean;
  description?: string;
  capacity?: number;
};

export type ResourceLocationItem = {
  id: string;
  name: string;
  active: boolean;
};

export type ResourceServiceCatalogItem = {
  id: string;
  name: string;
  active: boolean;
};

export type ResourceUpsertInput = {
  name: string;
  locationName: string;
  type: ResourceCardItem["type"];
  description?: string;
  capacity?: number | null;
  active: boolean;
};

export type TransferResourceInput = {
  locationName: string;
  clearSchedule: boolean;
};

export type ResourceListParams = {
  search: string;
  location: string;
  page: number;
  pageSize: number;
};

export type ResourceListResult = {
  data: ResourceCardItem[];
  total: number;
};

type DataEnvelope<T> = { data: T };

type ApiLocation = {
  id: string;
  name: string;
  active: boolean;
};

type ApiResource = {
  id: string;
  locationId: string;
  resourceType: ResourceCardItem["type"];
  name: string;
  description?: string | null;
  capacity?: number | null;
  active: boolean;
};

type ApiService = {
  id: string;
  name: string;
  active: boolean;
};

// ============================================================================
// DTO Mapping Layer
// ============================================================================

/**
 * API -> Domain: Transform API resource to domain card item
 */
function toCardItem(
  resource: ApiResource,
  locationName: string,
  assignedServices: ApiService[],
): ResourceCardItem {
  return {
    id: resource.id,
    locationId: resource.locationId,
    name: resource.name,
    locationName,
    type: resource.resourceType,
    serviceIds: assignedServices.map((service) => service.id),
    services: assignedServices.map((service) => service.name),
    active: resource.active,
    description: resource.description ?? undefined,
    capacity: resource.capacity ?? undefined,
  };
}

/**
 * Form -> API DTO: Create resource payload
 */
type CreateResourceDTO = {
  resourceType: ResourceCardItem["type"];
  name: string;
  description: string | null;
  capacity: number | null;
};

function toCreateResourceDTO(input: ResourceUpsertInput): CreateResourceDTO {
  return {
    resourceType: input.type,
    name: input.name,
    description: input.description || null,
    capacity: input.capacity ?? null,
  };
}

/**
 * Form -> API DTO: Update resource details payload
 */
type UpdateResourceDetailsDTO = {
  name: string;
  description: string | null;
  capacity: number | null;
  active: boolean;
};

function toUpdateResourceDetailsDTO(input: ResourceUpsertInput): UpdateResourceDetailsDTO {
  return {
    name: input.name,
    description: input.description || null,
    capacity: input.capacity ?? null,
    active: input.active,
  };
}

/**
 * Form -> API DTO: Transfer resource payload
 */
type TransferResourceDTO = {
  locationId: string;
  clearSchedule: boolean;
};

function toTransferResourceDTO(locationId: string, clearSchedule: boolean): TransferResourceDTO {
  return {
    locationId,
    clearSchedule,
  };
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Reusable error mapper for Resources module.
 * Uses shared createErrorMapper with module-specific overrides.
 */
export const toResourcesFriendlyMessage = createErrorMapper({
  notFound: "No se encontraron recursos para la busqueda aplicada.",
  fallback: "No pudimos cargar recursos por ahora. Vuelve a intentarlo.",
});

/**
 * Specific error mapper for subscription limits (402/SUBSCRIPTION_LIMIT).
 * Handles edge case not covered by generic mapper.
 */
export function toResourcesOperationError(error: AppError): string {
  if (error.status === 402 || error.code === "SUBSCRIPTION_LIMIT") {
    return "Alcanzaste el limite del plan para profesionales activos.";
  }
  if (error.status === 403 || error.code === "FORBIDDEN") {
    return "No tienes permisos para ver o modificar recursos.";
  }
  return toResourcesFriendlyMessage(error);
}

// ============================================================================
// Form Error Processing
// ============================================================================

/**
 * Process API error for form handling.
 * Extracts field-level errors and general message.
 * 
 * Usage in forms:
 * ```ts
 * const { fieldErrors, formError } = processFormError(error);
 * setFieldErrors(fieldErrors);
 * setFormError(formError);
 * ```
 */
export function processFormError(error: AppError): {
  fieldErrors: Record<string, string>;
  formError: string;
} {
  const fieldErrors = extractFieldErrors(error);

  // Get general error message using the mapper
  const formError = toResourcesOperationError(error);

  return { fieldErrors, formError };
}

// ============================================================================
// Validation
// ============================================================================

function assertResourceInput(input: ResourceUpsertInput) {
  const details: Array<{ field: string; message: string }> = [];
  if (!input.name.trim()) {
    details.push({ field: "name", message: "El nombre es obligatorio." });
  }
  if (!input.locationName.trim()) {
    details.push({ field: "locationName", message: "Debes seleccionar una ubicacion." });
  }
  if (input.capacity != null && input.capacity < 1) {
    details.push({ field: "capacity", message: "La capacidad minima es 1." });
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

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function ensureLocationId(locations: ResourceLocationItem[], locationName: string) {
  const location = locations.find((item) => item.name === locationName);
  if (!location) {
    throw toAppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ field: "locationName", message: "Debes seleccionar una ubicacion valida." }],
    });
  }
  return location.id;
}

async function fetchResourceById(id: string): Promise<ApiResource> {
  const response = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${id}`);
  return unwrapData<ApiResource>(response);
}

async function fetchAssignedServices(resourceId: string): Promise<ApiService[]> {
  const response = await httpRequest<DataEnvelope<ApiService[]>>(`/resources/${resourceId}/services`);
  return unwrapData<ApiService[]>(response);
}

export async function fetchResourceLocations(): Promise<ResourceLocationItem[]> {
  const response = await httpRequest<DataEnvelope<ApiLocation[]>>("/locations");
  const locations = unwrapData<ApiLocation[]>(response);
  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    active: location.active,
  }));
}

export async function fetchServicesCatalog(): Promise<ResourceServiceCatalogItem[]> {
  const response = await httpRequest<DataEnvelope<ApiService[]>>("/services");
  const services = unwrapData<ApiService[]>(response);
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    active: service.active,
  }));
}

export async function fetchResources(params: ResourceListParams): Promise<ResourceListResult> {
  const locations = await fetchResourceLocations();
  const locationMap = new Map(locations.map((item) => [item.id, item.name]));

  const resourcesByLocation = await Promise.all(
    locations.map(async (location) => {
      const response = await httpRequest<DataEnvelope<ApiResource[]>>(
        `/locations/${location.id}/resources`,
      );
      return unwrapData<ApiResource[]>(response);
    }),
  );

  const allResources = resourcesByLocation.flat();

  const servicesByResource = await Promise.all(
    allResources.map(async (resource) => ({
      resourceId: resource.id,
      services: await fetchAssignedServices(resource.id),
    })),
  );
  const assignedServiceMap = new Map(
    servicesByResource.map((item) => [item.resourceId, item.services]),
  );

  const search = normalizeText(params.search);
  const location = normalizeText(params.location);

  const cards = allResources.map((resource) => {
    const resourceLocationName = locationMap.get(resource.locationId) ?? "Sin ubicacion";
    return toCardItem(resource, resourceLocationName, assignedServiceMap.get(resource.id) ?? []);
  });

  const filtered = cards.filter((resource) => {
    const matchesSearch =
      !search ||
      normalizeText(resource.name).includes(search) ||
      normalizeText(resource.services.join(" ")).includes(search) ||
      normalizeText(resource.id).includes(search);
    const matchesLocation =
      location === "" ||
      location === normalizeText("Todas las ubicaciones") ||
      normalizeText(resource.locationName) === location;
    return matchesSearch && matchesLocation;
  });

  const start = params.page * params.pageSize;
  const end = start + params.pageSize;

  return {
    data: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function updateResourceActiveStatus(id: string, active: boolean): Promise<ResourceCardItem> {
  const response = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${id}`, {
    method: "PUT",
    body: { active },
  });
  const updated = unwrapData<ApiResource>(response);
  const [locations, assignedServices] = await Promise.all([
    fetchResourceLocations(),
    fetchAssignedServices(id),
  ]);
  const locationName = locations.find((item) => item.id === updated.locationId)?.name ?? "Sin ubicacion";
  return toCardItem(updated, locationName, assignedServices);
}

export async function createResource(input: ResourceUpsertInput): Promise<ResourceCardItem> {
  assertResourceInput(input);
  const locations = await fetchResourceLocations();
  const locationId = ensureLocationId(locations, input.locationName);

  const createResponse = await httpRequest<DataEnvelope<ApiResource>>(
    `/locations/${locationId}/resources`,
    {
      method: "POST",
      body: toCreateResourceDTO(input),
    },
  );
  let created = unwrapData<ApiResource>(createResponse);

  if (!input.active) {
    const updateResponse = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${created.id}`, {
      method: "PUT",
      body: { active: false },
    });
    created = unwrapData<ApiResource>(updateResponse);
  }

  return toCardItem(created, input.locationName, []);
}

export async function updateResourceDetails(id: string, input: ResourceUpsertInput): Promise<ResourceCardItem> {
  assertResourceInput(input);
  const [locations, updateResponse] = await Promise.all([
    fetchResourceLocations(),
    httpRequest<DataEnvelope<ApiResource>>(`/resources/${id}`, {
      method: "PUT",
      body: toUpdateResourceDetailsDTO(input),
    }),
  ]);

  let updated = unwrapData<ApiResource>(updateResponse);
  const desiredLocationId = ensureLocationId(locations, input.locationName);

  if (desiredLocationId !== updated.locationId) {
    const transferResponse = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${id}/location`, {
      method: "PUT",
      body: toTransferResourceDTO(desiredLocationId, false),
    });
    updated = unwrapData<ApiResource>(transferResponse);
  }

  const assignedServices = await fetchAssignedServices(id);
  const locationName = locations.find((item) => item.id === updated.locationId)?.name ?? input.locationName;
  return toCardItem(updated, locationName, assignedServices);
}

export async function transferResource(id: string, input: TransferResourceInput): Promise<ResourceCardItem> {
  const locations = await fetchResourceLocations();
  const locationId = ensureLocationId(locations, input.locationName);
  const response = await httpRequest<DataEnvelope<ApiResource>>(`/resources/${id}/location`, {
    method: "PUT",
    body: toTransferResourceDTO(locationId, input.clearSchedule),
  });
  const updated = unwrapData<ApiResource>(response);
  const assignedServices = await fetchAssignedServices(id);
  const locationName = locations.find((item) => item.id === updated.locationId)?.name ?? input.locationName;
  return toCardItem(updated, locationName, assignedServices);
}

export async function assignServicesToResource(id: string, serviceIds: string[]): Promise<ResourceCardItem> {
  const currentServices = await fetchAssignedServices(id);
  const currentIds = new Set(currentServices.map((item) => item.id));
  const nextIds = new Set(serviceIds);

  const toAssign = serviceIds.filter((serviceId) => !currentIds.has(serviceId));
  const toUnassign = currentServices
    .map((service) => service.id)
    .filter((serviceId) => !nextIds.has(serviceId));

  await Promise.all([
    ...toAssign.map((serviceId) =>
      httpRequest<DataEnvelope<string>>(`/resources/${id}/services`, {
        method: "POST",
        body: { serviceId },
      }),
    ),
    ...toUnassign.map((serviceId) =>
      httpRequest<void>(`/resources/${id}/services/${serviceId}`, {
        method: "DELETE",
      }),
    ),
  ]);

  const [resource, locations, finalServices] = await Promise.all([
    fetchResourceById(id),
    fetchResourceLocations(),
    fetchAssignedServices(id),
  ]);

  const locationName = locations.find((item) => item.id === resource.locationId)?.name ?? "Sin ubicacion";
  return toCardItem(resource, locationName, finalServices);
}
