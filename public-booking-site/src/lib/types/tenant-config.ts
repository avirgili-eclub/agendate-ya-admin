export type BrandingConfig = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  fontFamily: string;
  customFontUrl: string | null;
  borderRadius: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  faviconUrl: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  active: boolean;
  imageUrl?: string | null;
};

export type PublicLocation = {
  id: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PublicResource = {
  id: string;
  name: string;
  active: boolean;
  locationId?: string;
  locationName?: string;
  photoUrl?: string | null;
  serviceIds?: string[];
};

export type PublicBookingConfig = {
  slug: string;
  tenantName: string;
  published: boolean;
  branding: BrandingConfig;
  services: PublicService[];
  locations: PublicLocation[];
  resources: PublicResource[];
};
