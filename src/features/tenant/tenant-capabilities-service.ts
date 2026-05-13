import { httpRequest } from "@/core/api/http-client";
import type { TenantCapabilities } from "@/features/tenant/tenant-capabilities-types";

type MaybeDataEnvelope<T> = T | { data: T };

function unwrapMaybeData<T>(response: MaybeDataEnvelope<T>): T {
  if (typeof response === "object" && response !== null && "data" in response) {
    return response.data;
  }

  return response as T;
}

export async function fetchTenantCapabilities(): Promise<TenantCapabilities> {
  const response = await httpRequest<MaybeDataEnvelope<TenantCapabilities>>("/tenant/capabilities");
  return unwrapMaybeData(response);
}
