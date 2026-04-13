import type { PublicBookingConfig } from "../types/tenant-config";

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toBooleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parsePublicBookingConfigPayload(payload: unknown): Partial<PublicBookingConfig> {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const brandingSource =
    source.branding && typeof source.branding === "object"
      ? (source.branding as Record<string, unknown>)
      : {};

  const serviceItems = Array.isArray(source.services) ? source.services : [];
  const locationItems = Array.isArray(source.locations) ? source.locations : [];
  const resourceItems = Array.isArray(source.resources) ? source.resources : [];

  return {
    tenantName: toStringValue(source.tenantName) ?? undefined,
    published: toBooleanValue(source.published) ?? undefined,
    branding: {
      primaryColor: toStringValue(brandingSource.primaryColor) ?? undefined,
      secondaryColor: toStringValue(brandingSource.secondaryColor) ?? undefined,
      accentColor: toStringValue(brandingSource.accentColor) ?? undefined,
      backgroundColor: toStringValue(brandingSource.backgroundColor) ?? undefined,
      surfaceColor: toStringValue(brandingSource.surfaceColor) ?? undefined,
      textColor: toStringValue(brandingSource.textColor) ?? undefined,
      textSecondaryColor: toStringValue(brandingSource.textSecondaryColor) ?? undefined,
      fontFamily: toStringValue(brandingSource.fontFamily) ?? undefined,
      customFontUrl: toStringValue(brandingSource.customFontUrl),
      borderRadius: toStringValue(brandingSource.borderRadius) ?? undefined,
      logoUrl: toStringValue(brandingSource.logoUrl),
      coverImageUrl: toStringValue(brandingSource.coverImageUrl),
      faviconUrl: toStringValue(brandingSource.faviconUrl),
    },
    services: serviceItems
      .map((item) => {
        const service = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const id = toStringValue(service.id);
        const name = toStringValue(service.name);
        const durationMinutes = toNumberValue(service.durationMinutes);
        const active = toBooleanValue(service.active);

        if (!id || !name || durationMinutes == null || active == null) {
          return null;
        }

        return {
          id,
          name,
          description: toStringValue(service.description) ?? undefined,
          durationMinutes,
          price: toNumberValue(service.price) ?? undefined,
          active,
          imageUrl: toStringValue(service.imageUrl),
        };
      })
      .filter((service): service is NonNullable<typeof service> => service !== null),
    locations: locationItems
      .map((item) => {
        const location = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const id = toStringValue(location.id);
        const name = toStringValue(location.name);
        const address = toStringValue(location.address);

        if (!id || !name || !address) {
          return null;
        }

        return {
          id,
          name,
          address,
          latitude: toNumberValue(location.latitude),
          longitude: toNumberValue(location.longitude),
        };
      })
      .filter((location): location is NonNullable<typeof location> => location !== null),
    resources: resourceItems
      .map((item) => {
        const resource = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const id = toStringValue(resource.id);
        const name = toStringValue(resource.name);
        const active = toBooleanValue(resource.active);
        const rawServiceIds = Array.isArray(resource.serviceIds)
          ? resource.serviceIds.filter((serviceId): serviceId is string => typeof serviceId === "string")
          : [];

        if (!id || !name || active == null) {
          return null;
        }

        return {
          id,
          name,
          active,
          locationId: toStringValue(resource.locationId) ?? undefined,
          locationName: toStringValue(resource.locationName) ?? undefined,
          photoUrl: toStringValue(resource.photoUrl),
          serviceIds: rawServiceIds.length > 0 ? rawServiceIds : undefined,
        };
      })
      .filter((resource): resource is NonNullable<typeof resource> => resource !== null),
  };
}
