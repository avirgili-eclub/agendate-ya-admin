import type { PageServerLoad } from "./$types";
import { fetchBookingById } from "../../../lib/api/bookings";

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  const bookingId = params.bookingId;
  const { slug } = await parent();

  let booking = null;

  try {
    booking = await fetchBookingById(slug, bookingId, fetch);
  } catch {
    booking = null;
  }

  return {
    bookingId,
    booking,
  };
};
