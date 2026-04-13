<script lang="ts">
  export let data: {
    bookingConfig: {
      resources?: Array<{
        id: string;
        name: string;
        active: boolean;
        locationName?: string;
        serviceIds?: string[];
      }>;
    };
  };

  let serviceId = "";
  let hasAutoRedirected = false;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    serviceId = params.get("serviceId") ?? "";
  }

  const resources = ((data.bookingConfig.resources ?? []) as Array<any>)
    .filter((resource) => Boolean(resource?.active))
    .map((resource) => ({
      id: String(resource.id ?? ""),
      text: String(resource.name ?? "Profesional"),
      locationText: String(resource.locationName ?? "Ubicacion no informada"),
      serviceIds: Array.isArray(resource.serviceIds)
        ? resource.serviceIds.filter(
            (service): service is string => typeof service === "string",
          )
        : [],
    }))
    .filter((resource) => resource.id.length > 0);

  $: scopedResources = resources.filter((resource) => {
    if (!serviceId || resource.serviceIds.length === 0) {
      return true;
    }

    return resource.serviceIds.includes(serviceId);
  });

  $: scopedResourceIds = scopedResources.map((resource) => resource.id);
  $: scopedResourceTexts = scopedResources.map((resource) => resource.text);
  $: scopedLocationTexts = scopedResources.map(
    (resource) => resource.locationText,
  );

  $: if (
    typeof window !== "undefined" &&
    !hasAutoRedirected &&
    serviceId &&
    scopedResourceIds.length === 1
  ) {
    hasAutoRedirected = true;
    const nextUrl = `/book/schedule?serviceId=${encodeURIComponent(serviceId)}&resourceId=${encodeURIComponent(
      String(scopedResourceIds[0]),
    )}`;
    window.location.replace(nextUrl);
  }
</script>

<main class="book-step-2">
  <header>
    <p class="eyebrow">Paso 2 de 4</p>
    <h1>Selecciona un profesional</h1>
  </header>

  {#if !serviceId}
    <p class="empty-copy">
      Primero selecciona un servicio en el paso anterior.
    </p>
    <a href="/book" class="link-back">Volver al paso 1</a>
  {:else if scopedResources.length === 0}
    <p class="empty-copy">
      No hay profesionales disponibles para este servicio.
    </p>
  {:else}
    <ul class="resource-list">
      {#each scopedResourceIds as resourceId, index}
        <li>
          <a
            href={`/book/schedule?serviceId=${encodeURIComponent(serviceId)}&resourceId=${encodeURIComponent(String(resourceId))}`}
          >
            <strong>{scopedResourceTexts[index]}</strong>
            <span>{scopedLocationTexts[index]}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .book-step-2 {
    padding: 24px 20px 40px;
  }

  .eyebrow {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  h1 {
    margin: 8px 0 0;
    font-size: 1.8rem;
  }

  .resource-list {
    margin: 18px 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  .resource-list a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    padding: 12px 14px;
    text-decoration: none;
    color: var(--text);
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: #fff;
  }

  .resource-list span {
    color: var(--text-secondary);
    font-size: 0.92rem;
  }

  .empty-copy {
    margin-top: 16px;
    color: var(--text-secondary);
  }

  .link-back {
    display: inline-block;
    margin-top: 12px;
    color: var(--primary);
    text-decoration: none;
  }
</style>
