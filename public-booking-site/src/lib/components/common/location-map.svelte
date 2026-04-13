<script lang="ts">
  export let locationName = "Ubicacion";
  export let address = "";
  export let latitude: number | null = null;
  export let longitude: number | null = null;

  $: hasCoordinates =
    typeof latitude === "number" && typeof longitude === "number";
  $: openStreetMapEmbedUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(longitude) - 0.01}%2C${Number(latitude) - 0.01}%2C${Number(longitude) + 0.01}%2C${Number(latitude) + 0.01}&layer=mapnik&marker=${Number(latitude)}%2C${Number(longitude)}`
    : "";
  $: googleMapsDirectionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
</script>

<article class="location-card">
  <h3>{locationName}</h3>
  <p>{address || "Direccion no informada"}</p>

  {#if hasCoordinates}
    <iframe
      title={`Mapa de ${locationName}`}
      src={openStreetMapEmbedUrl}
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
  {:else}
    <div class="map-fallback">Mapa no disponible para esta ubicacion.</div>
  {/if}

  <a href={googleMapsDirectionsUrl} target="_blank" rel="noopener noreferrer"
    >Como llegar</a
  >
</article>

<style>
  .location-card {
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: var(--surface);
    padding: 12px;
    display: grid;
    gap: 8px;
  }

  .location-card h3 {
    margin: 0;
    font-size: 1rem;
  }

  .location-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  iframe {
    width: 100%;
    min-height: 180px;
    border: 0;
    border-radius: var(--radius);
  }

  .map-fallback {
    border-radius: var(--radius);
    min-height: 100px;
    display: grid;
    place-content: center;
    color: var(--text-secondary);
    background: #f3f4f6;
    font-size: 0.9rem;
    text-align: center;
    padding: 10px;
  }

  .location-card a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }
</style>
