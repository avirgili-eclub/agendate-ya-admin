<script lang="ts">
  import LocationMap from "../lib/components/common/location-map.svelte";

  export let data: {
    bookingConfig: {
      tenantName: string;
      services: Array<{ name: string; durationMinutes: number }>;
      locations?: Array<{
        id: string;
        name: string;
        address: string;
        latitude?: number | null;
        longitude?: number | null;
      }>;
    };
  };

  const tenantName = data.bookingConfig.tenantName;
  const highlightedServiceLabels = (
    (data.bookingConfig.services ?? []) as Array<{
      name: string;
      durationMinutes: number;
    }>
  )
    .slice(0, 4)
    .map((service) => `${service.name} (${service.durationMinutes} min)`);

  const locationRows = ((data.bookingConfig.locations ?? []) as Array<any>).map(
    (location) => ({
      id: String(location.id ?? ""),
      name: String(location.name ?? "Ubicacion"),
      address: String(location.address ?? ""),
      latitude:
        typeof location.latitude === "number" ? location.latitude : null,
      longitude:
        typeof location.longitude === "number" ? location.longitude : null,
    }),
  );

  const locationIds = locationRows.map((location) => location.id);
  const locationNames = locationRows.map((location) => location.name);
  const locationAddresses = locationRows.map((location) => location.address);
  const locationLatitudes = locationRows.map((location) => location.latitude);
  const locationLongitudes = locationRows.map((location) => location.longitude);
</script>

<main
  style="background: var(--background); color: var(--text); min-height: 100vh;"
>
  <section
    style="padding: 40px 20px; background: var(--surface); border-bottom: 1px solid #e5e7eb;"
  >
    <h1 style="margin: 0; font-size: 2rem; line-height: 1.2;">{tenantName}</h1>
    <p style="margin-top: 8px; color: var(--text-secondary);">
      Reserva tu turno en segundos, sin llamadas ni esperas.
    </p>
    <a
      href="/book"
      style="display: inline-block; margin-top: 16px; padding: 12px 18px; border-radius: var(--radius); background: var(--primary); color: #fff; text-decoration: none;"
    >
      Reservar turno
    </a>
  </section>

  <section style="padding: 24px 20px;">
    <h2 style="margin-top: 0;">Servicios destacados</h2>
    {#if highlightedServiceLabels.length === 0}
      <p style="color: var(--text-secondary);">
        Todavia no hay servicios publicados.
      </p>
    {:else}
      <ul style="padding-left: 18px;">
        {#each highlightedServiceLabels as serviceLabel}
          <li>{serviceLabel}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section style="padding: 0 20px 28px;">
    <h2 style="margin-top: 0;">Ubicaciones</h2>
    {#if locationRows.length === 0}
      <p style="color: var(--text-secondary);">
        Aun no hay ubicaciones publicadas.
      </p>
    {:else}
      <div
        style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));"
      >
        {#each locationIds as _, index}
          <LocationMap
            locationName={locationNames[index]}
            address={locationAddresses[index]}
            latitude={locationLatitudes[index]}
            longitude={locationLongitudes[index]}
          />
        {/each}
      </div>
    {/if}
  </section>
</main>
