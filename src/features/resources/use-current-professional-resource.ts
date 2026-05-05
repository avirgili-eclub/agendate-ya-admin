import { useQuery } from "@tanstack/react-query";

import { unwrapData } from "@/core/api/envelope";
import { httpRequest } from "@/core/api/http-client";
import { getSessionState } from "@/core/auth/session-store";

type DataEnvelope<T> = { data: T };

export type ProfessionalResourceProfile = {
  id: string;
  locationId: string;
  resourceType: "PROFESSIONAL" | "TABLE" | "ROOM" | "EQUIPMENT";
  name: string;
  imageUrl?: string | null;
  active: boolean;
  calendarConnected?: boolean;
};

async function fetchProfessionalResourceProfile(resourceId: string) {
  const response = await httpRequest<DataEnvelope<ProfessionalResourceProfile>>(
    `/resources/${resourceId}`,
  );
  return unwrapData<ProfessionalResourceProfile>(response);
}

export function useCurrentProfessionalResource() {
  const session = getSessionState();
  const role = session.user?.role?.toUpperCase() ?? "";
  const resourceId = session.user?.resourceId;
  const isProfessional = role === "PROFESSIONAL";

  const query = useQuery({
    queryKey: ["resources", "current-professional", resourceId],
    queryFn: () => fetchProfessionalResourceProfile(resourceId ?? ""),
    enabled: isProfessional && !!resourceId,
    staleTime: 60_000,
  });

  return {
    ...query,
    isProfessional,
    resourceId: resourceId ?? null,
    resourceName: query.data?.name ?? null,
  };
}
