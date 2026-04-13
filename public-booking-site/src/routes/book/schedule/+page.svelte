<script lang="ts">
  import { fetchAvailability } from "../../../lib/api/availability";
  import type { TimeSlot } from "../../../lib/api/availability";

  export let data: {
    slug: string;
  };

  let serviceId = "";
  let resourceId = "";
  let selectedDate = "";
  let selectedTime = "";

  let slots: TimeSlot[] = [];
  let availableSlotTimes: string[] = [];
  let loading = false;
  let error = "";
  let lastLoadedDate = "";

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    serviceId = params.get("serviceId") ?? "";
    resourceId = params.get("resourceId") ?? "";
    selectedDate = params.get("date") ?? "";
    selectedTime = params.get("time") ?? "";
  }

  const today = new Date().toISOString().split("T")[0];
  let dateInput = selectedDate || today;

  async function loadAvailability(date: string) {
    if (!serviceId || !resourceId || !date) {
      return;
    }

    loading = true;
    error = "";
    slots = [];

    try {
      const result = await fetchAvailability(
        data.slug,
        resourceId,
        serviceId,
        date,
        fetch,
      );
      slots = result.slots;
      availableSlotTimes = result.slots
        .filter((slot) => slot.available)
        .map((slot) => String(slot.time));
      lastLoadedDate = date;

      if (selectedTime && !availableSlotTimes.includes(selectedTime)) {
        selectedTime = "";
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("date", date);

        if (!selectedTime) {
          params.delete("time");
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      }
      selectedDate = date;
    } catch (err) {
      error =
        "No se pudo cargar la disponibilidad. Intentá de nuevo en un momento.";
    } finally {
      loading = false;
    }
  }

  function selectSlot(time: string) {
    selectedTime = time;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("time", time);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }

  function handleDateChange() {
    selectedTime = "";
    loadAvailability(dateInput);
  }

  function goToConfirm() {
    if (!selectedDate || !selectedTime) {
      return;
    }

    const confirmUrl = `/book/confirm?serviceId=${encodeURIComponent(serviceId)}&resourceId=${encodeURIComponent(resourceId)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime)}`;
    window.location.href = confirmUrl;
  }

  $: if (
    typeof window !== "undefined" &&
    selectedDate &&
    selectedDate !== lastLoadedDate &&
    !loading &&
    !error
  ) {
    loadAvailability(selectedDate);
  }
</script>

<main class="book-step-3">
  <header>
    <p class="eyebrow">Paso 3 de 4</p>
    <h1>Selecciona fecha y horario</h1>
  </header>

  {#if !serviceId || !resourceId}
    <p class="empty-copy">
      Primero selecciona un servicio y profesional en los pasos anteriores.
    </p>
    <a href="/book" class="link-back">Volver al paso 1</a>
  {:else}
    <div class="date-picker">
      <label for="date-input">Fecha</label>
      <input
        id="date-input"
        type="date"
        bind:value={dateInput}
        min={today}
        on:change={handleDateChange}
      />
    </div>

    {#if loading}
      <p class="loading-copy">Cargando horarios disponibles...</p>
    {:else if error}
      <div class="error-box">
        <p>{error}</p>
        <button type="button" on:click={() => loadAvailability(dateInput)}
          >Reintentar</button
        >
      </div>
    {:else if slots.length === 0}
      <p class="empty-copy">No hay horarios disponibles para esta fecha.</p>
    {:else}
      <div class="slots-section">
        <p class="slots-label">Horarios disponibles</p>
        <ul class="slot-list">
          {#each availableSlotTimes as slotTime}
            <li>
              <button
                type="button"
                class:selected={selectedTime === String(slotTime)}
                on:click={() => selectSlot(String(slotTime))}
              >
                {String(slotTime)}
              </button>
            </li>
          {/each}
        </ul>

        {#if availableSlotTimes.length === 0}
          <p class="empty-copy">No hay horarios disponibles para esta fecha.</p>
        {/if}
      </div>
    {/if}

    {#if selectedTime}
      <button type="button" class="cta-confirm" on:click={goToConfirm}>
        Continuar a confirmación
      </button>
    {/if}
  {/if}
</main>

<style>
  .book-step-3 {
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

  .date-picker {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .date-picker label {
    font-weight: 500;
    font-size: 0.95rem;
  }

  .date-picker input {
    padding: 12px 14px;
    font-size: 1rem;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: #fff;
  }

  .slots-section {
    margin-top: 20px;
  }

  .slots-label {
    margin: 0 0 10px;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .slot-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
  }

  .slot-list button {
    min-height: 44px;
    padding: 10px 8px;
    font-size: 0.95rem;
    font-weight: 500;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: #fff;
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .slot-list button:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  .slot-list button.selected {
    border-color: var(--primary);
    background: var(--primary);
    color: #fff;
  }

  .cta-confirm {
    margin-top: 24px;
    width: 100%;
    min-height: 48px;
    padding: 12px 20px;
    font-size: 1.05rem;
    font-weight: 600;
    border: none;
    border-radius: var(--radius);
    background: var(--primary);
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cta-confirm:hover {
    opacity: 0.9;
  }

  .empty-copy {
    margin-top: 16px;
    color: var(--text-secondary);
  }

  .loading-copy {
    margin-top: 16px;
    color: var(--text-secondary);
  }

  .link-back {
    display: inline-block;
    margin-top: 12px;
    color: var(--primary);
    text-decoration: none;
  }

  .error-box {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid #ef4444;
    border-radius: var(--radius);
    background: #fee2e2;
  }

  .error-box p {
    margin: 0 0 10px;
    color: #991b1b;
  }

  .error-box button {
    padding: 8px 16px;
    font-size: 0.9rem;
    border: 1px solid #991b1b;
    border-radius: var(--radius);
    background: #fff;
    color: #991b1b;
    cursor: pointer;
  }
</style>
