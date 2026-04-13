<script lang="ts">
  import { createBooking, type BookingError } from "../../../lib/api/bookings";

  export let data: {
    slug: string;
    bookingConfig: {
      services: Array<{ id: string; name: string; durationMinutes: number }>;
      resources: Array<{ id: string; name: string }>;
    };
  };

  let serviceId = "";
  let resourceId = "";
  let date = "";
  let time = "";

  let clientName = "";
  let clientPhone = "";
  let clientEmail = "";
  let notes = "";

  let submitting = false;
  let error = "";
  let hasSlotConflict = false;

  $: scheduleHref = `/book/schedule?serviceId=${encodeURIComponent(serviceId)}&resourceId=${encodeURIComponent(resourceId)}&date=${encodeURIComponent(date)}`;
  $: draftStorageKey = `booking-confirm-draft:${data.slug}:${serviceId}:${resourceId}:${date}`;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    serviceId = params.get("serviceId") ?? "";
    resourceId = params.get("resourceId") ?? "";
    date = params.get("date") ?? "";
    time = params.get("time") ?? "";

    if (serviceId && resourceId && date) {
      const rawDraft = window.sessionStorage.getItem(draftStorageKey);
      if (rawDraft) {
        try {
          const parsed = JSON.parse(rawDraft) as {
            clientName?: string;
            clientPhone?: string;
            clientEmail?: string;
            notes?: string;
          };

          clientName = parsed.clientName ?? "";
          clientPhone = parsed.clientPhone ?? "";
          clientEmail = parsed.clientEmail ?? "";
          notes = parsed.notes ?? "";
        } catch {
          window.sessionStorage.removeItem(draftStorageKey);
        }
      }
    }
  }

  $: if (typeof window !== "undefined" && serviceId && resourceId && date) {
    const payload = {
      clientName,
      clientPhone,
      clientEmail,
      notes,
    };
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }

  $: service =
    data.bookingConfig.services.find((s) => s.id === serviceId) || null;
  $: resource =
    data.bookingConfig.resources.find((r) => r.id === resourceId) || null;

  $: formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  async function handleSubmit() {
    if (!clientName.trim() || !clientPhone.trim()) {
      error = "Por favor completá tu nombre y teléfono";
      hasSlotConflict = false;
      return;
    }

    submitting = true;
    error = "";
    hasSlotConflict = false;

    try {
      const response = await createBooking(
        data.slug,
        {
          serviceId,
          resourceId,
          date,
          time,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        fetch,
      );

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(draftStorageKey);
        window.location.href = `/confirmation/${response.bookingId}`;
      }
    } catch (err) {
      submitting = false;

      if (err && typeof err === "object" && "code" in err) {
        const bookingError = err as BookingError;

        if (bookingError.code === "SLOT_CONFLICT") {
          hasSlotConflict = true;
          error =
            "El horario que seleccionaste ya no está disponible. Por favor elegí otro horario.";
        } else if (bookingError.code === "VALIDATION_ERROR") {
          hasSlotConflict = false;
          error = bookingError.message;
        } else {
          hasSlotConflict = false;
          error =
            "Ocurrió un error al crear tu reserva. Intentá de nuevo en un momento.";
        }
      } else {
        hasSlotConflict = false;
        error =
          "Ocurrió un error al crear tu reserva. Intentá de nuevo en un momento.";
      }
    }
  }
</script>

<main class="book-step-4">
  <header>
    <p class="eyebrow">Paso 4 de 4</p>
    <h1>Confirmá tu reserva</h1>
  </header>

  {#if !serviceId || !resourceId || !date || !time}
    <p class="empty-copy">
      Primero completá los pasos anteriores para seleccionar servicio,
      profesional, fecha y horario.
    </p>
    <a href="/book" class="link-back">Volver al inicio</a>
  {:else}
    <section class="summary">
      <h2>Resumen</h2>
      <dl>
        <dt>Servicio</dt>
        <dd>{service?.name || serviceId}</dd>

        <dt>Profesional</dt>
        <dd>{resource?.name || resourceId}</dd>

        <dt>Fecha</dt>
        <dd>{formattedDate}</dd>

        <dt>Horario</dt>
        <dd>{time} hs ({service?.durationMinutes || 0} min)</dd>
      </dl>
    </section>

    <form on:submit|preventDefault={handleSubmit}>
      <h2>Tus datos</h2>

      {#if error}
        <div class="error-box">
          <p>{error}</p>
          {#if hasSlotConflict}
            <a href={scheduleHref} class="conflict-link">Elegir otro horario</a>
          {/if}
        </div>
      {/if}

      <div class="field">
        <label for="client-name">Nombre completo *</label>
        <input
          id="client-name"
          type="text"
          bind:value={clientName}
          required
          disabled={submitting}
          placeholder="Ingresá tu nombre completo"
        />
      </div>

      <div class="field">
        <label for="client-phone">Teléfono *</label>
        <input
          id="client-phone"
          type="tel"
          bind:value={clientPhone}
          required
          disabled={submitting}
          placeholder="Ej: +54 9 11 1234-5678"
        />
      </div>

      <div class="field">
        <label for="client-email">Email (opcional)</label>
        <input
          id="client-email"
          type="email"
          bind:value={clientEmail}
          disabled={submitting}
          placeholder="tu-email@ejemplo.com"
        />
      </div>

      <div class="field">
        <label for="notes">Notas adicionales (opcional)</label>
        <textarea
          id="notes"
          bind:value={notes}
          disabled={submitting}
          rows="3"
          placeholder="Algún comentario o pedido especial..."
        ></textarea>
      </div>

      <button type="submit" class="cta-submit" disabled={submitting}>
        {submitting ? "Confirmando..." : "Confirmar reserva"}
      </button>
    </form>
  {/if}
</main>

<style>
  .book-step-4 {
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

  .summary {
    margin-top: 24px;
    padding: 16px;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: var(--surface);
  }

  .summary h2 {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }

  .summary dl {
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .summary dt {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .summary dd {
    margin: 0 0 8px;
    font-size: 1rem;
  }

  form {
    margin-top: 28px;
  }

  form h2 {
    margin: 0 0 16px;
    font-size: 1.1rem;
  }

  .field {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-weight: 500;
    font-size: 0.95rem;
  }

  .field input,
  .field textarea {
    padding: 12px 14px;
    font-size: 1rem;
    font-family: inherit;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: #fff;
  }

  .field input:disabled,
  .field textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .field textarea {
    resize: vertical;
  }

  .cta-submit {
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

  .cta-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .cta-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .error-box {
    margin-bottom: 16px;
    padding: 14px;
    border: 1px solid #ef4444;
    border-radius: var(--radius);
    background: #fee2e2;
  }

  .error-box p {
    margin: 0;
    color: #991b1b;
    font-weight: 500;
  }

  .conflict-link {
    display: inline-block;
    margin-top: 10px;
    color: #991b1b;
    text-decoration: underline;
    font-weight: 600;
  }
</style>
