<script lang="ts">
  import {
    cancelBooking,
    listBookingsByPhone,
    type PublicApiError,
    type PublicBookingSummary,
  } from "../../lib/api/bookings";

  export let data: {
    slug: string;
  };

  let phoneInput = "";
  let selectedPhone = "";
  let loading = false;
  let error = "";
  let canRetry = false;
  let cancellingBookingId = "";
  let hasLoaded = false;

  let bookingRows: PublicBookingSummary[] = [];

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const phoneFromUrl = params.get("phone") ?? "";
    phoneInput = phoneFromUrl;
    selectedPhone = phoneFromUrl;
  }

  function toUserMessage(rawError: unknown, fallback: string): string {
    if (!rawError || typeof rawError !== "object" || !("code" in rawError)) {
      return fallback;
    }

    const typedError = rawError as PublicApiError;

    if (typedError.code === "NETWORK_TIMEOUT") {
      return "La consulta tardo demasiado. Reintenta en unos segundos.";
    }

    if (typedError.code === "NETWORK_ERROR") {
      return "No pudimos conectar. Revisa tu conexion e intenta nuevamente.";
    }

    return typedError.message || fallback;
  }

  async function loadBookings(phone: string) {
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      bookingRows = [];
      selectedPhone = "";
      return;
    }

    loading = true;
    error = "";
    canRetry = false;

    try {
      bookingRows = await listBookingsByPhone(
        data.slug,
        normalizedPhone,
        fetch,
      );
      selectedPhone = normalizedPhone;
      hasLoaded = true;
    } catch (lookupError) {
      error = toUserMessage(
        lookupError,
        "No pudimos cargar tus turnos. Intenta nuevamente en unos minutos.",
      );
      canRetry = true;
      hasLoaded = true;
    } finally {
      loading = false;
    }
  }

  function updateUrlPhone(phone: string) {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (!phone) {
      url.searchParams.delete("phone");
    } else {
      url.searchParams.set("phone", phone);
    }

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  async function submitLookup() {
    const normalizedPhone = phoneInput.trim();
    if (!normalizedPhone) {
      error = "Ingresa un telefono para consultar tus turnos.";
      return;
    }

    updateUrlPhone(normalizedPhone);
    await loadBookings(normalizedPhone);
  }

  async function handleCancel(bookingId: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "¿Seguro que queres cancelar este turno? Esta accion no se puede deshacer.",
      );
      if (!confirmed) {
        return;
      }
    }

    cancellingBookingId = bookingId;
    error = "";
    canRetry = false;

    try {
      await cancelBooking(data.slug, bookingId, fetch);
      bookingRows = bookingRows.filter((booking) => booking.id !== bookingId);
    } catch (cancelError) {
      error = toUserMessage(
        cancelError,
        "No pudimos cancelar el turno. Intenta nuevamente.",
      );
      canRetry = true;
    } finally {
      cancellingBookingId = "";
    }
  }

  async function retryLastAction() {
    if (selectedPhone) {
      await loadBookings(selectedPhone);
    }
  }

  $: if (
    typeof window !== "undefined" &&
    selectedPhone &&
    !hasLoaded &&
    !loading
  ) {
    loadBookings(selectedPhone);
  }

  $: visibleBookingIds = bookingRows.map((booking) => String(booking.id));
  $: visibleBookingLines = bookingRows.map(
    (booking) =>
      `${booking.serviceName} con ${booking.resourceName} - ${booking.date} ${booking.time} hs`,
  );
  $: visibleBookingStatuses = bookingRows.map((booking) =>
    String(booking.status),
  );
</script>

<main class="my-bookings-page">
  <header>
    <h1>Mis turnos</h1>
    <p>Consulta tus proximos turnos y cancelalos si lo necesitas.</p>
  </header>

  <form class="lookup-form" on:submit|preventDefault={submitLookup}>
    <label for="phone-input">Telefono</label>
    <div class="lookup-row">
      <input
        id="phone-input"
        type="tel"
        bind:value={phoneInput}
        placeholder="Ej: +595 981 123456"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  </form>

  {#if error}
    <div class="error-box">
      <p>{error}</p>
      {#if canRetry}
        <button type="button" on:click={retryLastAction} disabled={loading}
          >Reintentar</button
        >
      {/if}
    </div>
  {/if}

  {#if !loading && hasLoaded && visibleBookingIds.length === 0}
    <p class="empty-copy">No encontramos turnos futuros para ese telefono.</p>
  {/if}

  {#if visibleBookingIds.length > 0}
    <ul class="booking-list">
      {#each visibleBookingIds as bookingId, index}
        <li class="booking-item">
          <p>{visibleBookingLines[index]}</p>
          <small>Estado: {visibleBookingStatuses[index]}</small>
          <button
            type="button"
            class="cancel-button"
            disabled={cancellingBookingId === String(bookingId)}
            on:click={() => handleCancel(String(bookingId))}
          >
            {cancellingBookingId === String(bookingId)
              ? "Cancelando..."
              : "Cancelar turno"}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .my-bookings-page {
    padding: 24px 20px 40px;
  }

  h1 {
    margin: 0;
    font-size: 1.8rem;
  }

  header p {
    margin-top: 8px;
    color: var(--text-secondary);
  }

  .lookup-form {
    margin-top: 18px;
    display: grid;
    gap: 8px;
  }

  .lookup-form label {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .lookup-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .lookup-row input {
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    font-size: 1rem;
  }

  .lookup-row button {
    border: none;
    border-radius: var(--radius);
    padding: 0 16px;
    min-height: 44px;
    background: var(--primary);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  .lookup-row button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-box {
    margin-top: 12px;
    padding: 12px;
    border: 1px solid #dc2626;
    border-radius: var(--radius);
    background: #fee2e2;
    color: #991b1b;
    display: grid;
    gap: 8px;
  }

  .error-box p {
    margin: 0;
  }

  .error-box button {
    justify-self: start;
    border: 1px solid #991b1b;
    background: #fff;
    color: #991b1b;
    border-radius: var(--radius);
    padding: 8px 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .error-box button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .empty-copy {
    margin-top: 14px;
    color: var(--text-secondary);
  }

  .booking-list {
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  .booking-item {
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: var(--surface);
    padding: 12px;
    display: grid;
    gap: 6px;
  }

  .booking-item p {
    margin: 0;
  }

  .booking-item small {
    color: var(--text-secondary);
  }

  .cancel-button {
    justify-self: start;
    border: 1px solid #dc2626;
    border-radius: var(--radius);
    padding: 8px 12px;
    background: #fff;
    color: #b91c1c;
    cursor: pointer;
    font-weight: 600;
  }

  .cancel-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
