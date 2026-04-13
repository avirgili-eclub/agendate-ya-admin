export type TimeSlot = {
  time: string; // "HH:mm" format
  available: boolean;
};

export type AvailabilityResponse = {
  date: string; // "YYYY-MM-DD"
  slots: TimeSlot[];
};

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE_URL ?? "";

export async function fetchAvailability(
  slug: string,
  resourceId: string,
  serviceId: string,
  date: string,
  fetchImpl: typeof fetch,
): Promise<AvailabilityResponse> {
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/${slug}/resources/${resourceId}/availability?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`;

  const response = await fetchImpl(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Availability request failed with status ${response.status}`);
  }

  const payload = await response.json();

  return {
    date: String(payload.date ?? date),
    slots: Array.isArray(payload.slots)
      ? payload.slots.map((slot: any) => ({
          time: String(slot.time ?? "00:00"),
          available: Boolean(slot.available),
        }))
      : [],
  };
}
