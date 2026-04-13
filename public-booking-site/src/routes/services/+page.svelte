<script lang="ts">
  export let data: {
    bookingConfig: {
      services: Array<{
        id: string;
        name: string;
        description?: string;
        durationMinutes: number;
        price?: number;
        active: boolean;
      }>;
    };
  };

  function formatPrice(price?: number): string {
    if (price == null) {
      return "Precio a confirmar";
    }

    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0,
    }).format(price);
  }

  const serviceRows = ((data.bookingConfig.services ?? []) as Array<any>)
    .filter((service) => Boolean(service?.active))
    .map((service) => ({
      id: String(service.id ?? ""),
      text: `${String(service.name ?? "Servicio")} - ${Number(service.durationMinutes ?? 0)} min - ${formatPrice(
        typeof service.price === "number" ? service.price : undefined,
      )}`,
      description: String(
        service.description ?? "Servicio disponible para reserva online.",
      ),
    }))
    .filter((service) => service.id.length > 0);

  const serviceLineTexts = serviceRows.map((row) => row.text);
  const serviceDescriptions = serviceRows.map((row) => row.description);
  const serviceLinks = serviceRows.map(
    (row) => `/book?serviceId=${encodeURIComponent(row.id)}`,
  );
</script>

<main class="services-page">
  <header>
    <h1>Servicios</h1>
    <p>Elegi el servicio que queres reservar.</p>
  </header>

  {#if serviceLineTexts.length === 0}
    <p class="empty-copy">No hay servicios activos por el momento.</p>
  {:else}
    <ul class="services-grid">
      {#each serviceLineTexts as serviceLine, index}
        <li class="service-card">
          <h2>{serviceLine}</h2>
          <p>{serviceDescriptions[index]}</p>
          <a href={serviceLinks[index]}>Reservar</a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .services-page {
    padding: 24px 20px 40px;
  }

  h1 {
    margin: 0;
    font-size: 1.85rem;
  }

  header p {
    margin-top: 8px;
    color: var(--text-secondary);
  }

  .services-grid {
    margin: 18px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .service-card {
    border: 1px solid #e5e7eb;
    border-radius: var(--radius);
    background: var(--surface);
    padding: 14px;
  }

  .service-card h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .service-card p {
    margin: 10px 0;
    color: var(--text-secondary);
    min-height: 44px;
  }

  .service-card a {
    display: inline-block;
    text-decoration: none;
    background: var(--primary);
    color: #fff;
    padding: 10px 14px;
    border-radius: var(--radius);
    min-height: 44px;
    line-height: 24px;
  }

  .empty-copy {
    margin-top: 16px;
    color: var(--text-secondary);
  }
</style>
