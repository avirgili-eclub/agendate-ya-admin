import { error, redirect, type LayoutServerLoad } from "@sveltejs/kit";
import { fetchPublicBookingConfig } from "../lib/api/public-booking-config";
import { extractSlugFromHost } from "../lib/utils/slug";

export const load: LayoutServerLoad = async ({ request, fetch, url }) => {
  const host = request.headers.get("host");
  const slug = extractSlugFromHost(host);

  if (!slug) {
    throw error(404, "Tenant no encontrado para este dominio");
  }

  try {
    const bookingConfig = await fetchPublicBookingConfig(slug, fetch);

    if (!bookingConfig.published && url.pathname !== "/not-published") {
      throw redirect(307, "/not-published");
    }

    return {
      slug,
      bookingConfig,
    };
  } catch (loadError) {
    if (loadError && typeof loadError === "object" && "status" in loadError) {
      throw loadError;
    }

    throw error(503, "No se pudo cargar la configuracion publica del negocio");
  }
};
