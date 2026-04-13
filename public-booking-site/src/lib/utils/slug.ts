const RESERVED_SUBDOMAINS = new Set(["www", "site", "admin", "api", "localhost"]);

export function extractSlugFromHost(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) {
    return null;
  }

  const host = hostHeader.split(":")[0].trim().toLowerCase();
  if (!host) {
    return null;
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  const parts = host.split(".");
  if (parts.length < 3) {
    return null;
  }

  const candidate = parts[0];
  if (!candidate || RESERVED_SUBDOMAINS.has(candidate)) {
    return null;
  }

  return candidate;
}
