const DEFAULT_BOOKING_SITE_DOMAIN = "site.agendateya.app";

export function getBookingSiteDomain(): string {
  const configured = (import.meta.env.VITE_BOOKING_SITE_DOMAIN as string | undefined)?.trim();
  if (configured) return configured;
  return DEFAULT_BOOKING_SITE_DOMAIN;
}

export function getBookingSiteUrl(slug: string): string {
  return `https://${slug}.${getBookingSiteDomain()}`;
}
