<script lang="ts">
  export let data: {
    bookingConfig: {
      services: Array<{
        id: string;
        name: string;
        durationMinutes: number;
        active: boolean;
      }>;
    };
  };

  const serviceRows = ((data.bookingConfig.services ?? []) as Array<any>)
    .filter((service) => Boolean(service?.active))
    .map((service) => ({
      id: String(service.id ?? ""),
      text: `${String(service.name ?? "Servicio")} (${Number(service.durationMinutes ?? 0)} min)`,
    }))
    .filter((service) => service.id.length > 0);

  const serviceIds = serviceRows.map((service) => service.id);
  const serviceTexts = serviceRows.map((service) => service.text);

  let selectedServiceId = "";

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    selectedServiceId = params.get("serviceId") ?? "";

    if (!selectedServiceId && serviceIds.length === 1) {
      selectService(serviceIds[0]);
    }
  }

  function selectService(serviceId: string) {
    selectedServiceId = serviceId;

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("serviceId", serviceId);
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  $: nextHref = selectedServiceId
    ? `/book/resource?serviceId=${encodeURIComponent(selectedServiceId)}`
    : "/book/resource";
</script>

<main class="book-step-1">
  <header>
    <p class="eyebrow">Paso 1 de 4</p>
    <h1>Selecciona un servicio</h1>
  </header>

  {#if serviceIds.length === 0}
    <p class="empty-copy">
      No hay servicios disponibles para reservar en este momento.
    </p>
  {:else}
    <ul class="service-list">
      {#each serviceIds as serviceId, index}
        <li>
          <button
            type="button"
            class:selected={selectedServiceId === String(serviceId)}
            on:click={() => selectService(String(serviceId))}
          >
            <strong>{serviceTexts[index]}</strong>
          </button>
        </li>
      {/each}
    </ul>

    <a href={nextHref} class="next-button" aria-disabled={!selectedServiceId}
      >Siguiente: recurso</a
    >
  {/if}
</main>

<style>
  .book-step-1 {
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

  .service-list {
    margin: 18px 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  .service-list button {
    width: 100%;
    min-height: 52px;
    border-radius: var(--radius);
    border: 1px solid #d1d5db;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    cursor: pointer;
  }

  .service-list button.selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 26%, transparent);
    background: color-mix(in oklab, var(--primary) 8%, #fff);
  }

  .next-button {
    display: inline-block;
    text-decoration: none;
    border-radius: var(--radius);
    background: var(--primary);
    color: #fff;
    padding: 12px 16px;
    min-height: 44px;
  }

  .next-button[aria-disabled="true"] {
    pointer-events: none;
    opacity: 0.45;
  }

  .empty-copy {
    margin-top: 16px;
    color: var(--text-secondary);
  }
</style>
