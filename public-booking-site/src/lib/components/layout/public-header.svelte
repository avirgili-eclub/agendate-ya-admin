<script lang="ts">
  export let tenantName = "AgendateYA";
  export let logoUrl: string | null = null;
</script>

<header class="public-header">
  <a href="/" class="brand" aria-label="Ir al inicio">
    {#if logoUrl}
      <img
        src={logoUrl}
        alt={`Logo de ${tenantName}`}
        loading="eager"
        width="40"
        height="40"
      />
    {:else}
      <span class="logo-fallback" aria-hidden="true">A</span>
    {/if}
    <span>{tenantName}</span>
  </a>

  <nav class="nav-actions" aria-label="Navegacion principal">
    <a href="/services">Servicios</a>
    <a href="/book">Reservar</a>
    <a href="/my-bookings">Mis turnos</a>
  </nav>
</header>

<style>
  .public-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #e5e7eb;
    background: var(--surface);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    text-decoration: none;
    font-weight: 700;
  }

  .brand img,
  .logo-fallback {
    border-radius: 999px;
  }

  .logo-fallback {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: var(--primary);
  }

  .nav-actions {
    display: inline-flex;
    gap: 14px;
  }

  .nav-actions a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.95rem;
  }

  @media (max-width: 760px) {
    .nav-actions {
      gap: 10px;
      font-size: 0.85rem;
    }
  }
</style>
