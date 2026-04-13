import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  const { slug } = await parent();
  return {
    slug,
  };
};
