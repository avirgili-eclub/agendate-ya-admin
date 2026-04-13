import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  const { slug, bookingConfig } = await parent();
  return {
    slug,
    bookingConfig,
  };
};
