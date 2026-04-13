<script lang="ts">
  type BookingView = {
    id: string;
    serviceName: string;
    resourceName: string;
    date: string;
    time: string;
    durationMinutes: number;
    locationAddress?: string;
  };

  export let data: {
    bookingId: string;
    booking?: BookingView | null;
  };

  const booking = data.booking ?? null;
  const bookingDateLabel = booking?.date
    ? new Date(`${booking.date}T00:00:00`).toLocaleDateString("es-PY", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  function toCompactDateTime(date: string, time: string): string {
    const [year, month, day] = date.split("-");
    const [hours, minutes] = time.split(":");
    return `${year}${month}${day}T${hours}${minutes}00`;
  }

  function plusMinutes(time: string, minutesToAdd: number): string {
    const [hours, minutes] = time.split(":").map((value) => Number(value));
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const nextHours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, "0");
    const nextMinutes = (normalized % 60).toString().padStart(2, "0");
    return `${nextHours}:${nextMinutes}`;
  }

  function buildGoogleCalendarUrl(): string {
    if (!booking || !booking.date || !booking.time) {
      return "";
    }

    const start = toCompactDateTime(booking.date, booking.time);
    const end = toCompactDateTime(
      booking.date,
      plusMinutes(booking.time, booking.durationMinutes || 30),
    );
    const title = encodeURIComponent(`Turno - ${booking.serviceName}`);
    const details = encodeURIComponent(
      `Profesional: ${booking.resourceName}\nReserva ID: ${booking.id}`,
    );
    const location = encodeURIComponent(booking.locationAddress ?? "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  const googleCalendarUrl = buildGoogleCalendarUrl();
</script>

<main class="confirmation-page">
  <div class="success-icon">✓</div>

  <header>
    <h1>¡Reserva confirmada!</h1>
    <p class="subtitle">Tu turno ha sido confirmado exitosamente.</p>
  </header>

  <section class="booking-info">
    <p class="booking-id">
      <strong>ID de reserva:</strong>
      {data.bookingId}
    </p>
    {#if booking}
      <p><strong>Servicio:</strong> {booking.serviceName}</p>
      <p><strong>Profesional:</strong> {booking.resourceName}</p>
      <p><strong>Fecha:</strong> {bookingDateLabel}</p>
      <p><strong>Hora:</strong> {booking.time} hs</p>
      {#if booking.locationAddress}
        <p><strong>Ubicacion:</strong> {booking.locationAddress}</p>
      {/if}
    {/if}
    <p class="note">Guardá este número para consultar o cancelar tu turno.</p>
  </section>

  <section class="actions">
    {#if googleCalendarUrl}
      <a
        href={googleCalendarUrl}
        class="action-calendar"
        target="_blank"
        rel="noopener noreferrer"
      >
        Agregar a Google Calendar
      </a>
    {/if}
    <a href="/book" class="action-primary"> Reservar otro turno </a>
    <a href="/my-bookings" class="action-secondary"> Ver mis turnos </a>
  </section>
</main>

<style>
  .confirmation-page {
    padding: 40px 20px;
    text-align: center;
  }

  .success-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin: 0 auto;
    font-size: 3rem;
    color: #fff;
    background: #10b981;
    border-radius: 50%;
  }

  header {
    margin-top: 24px;
  }

  h1 {
    margin: 0;
    font-size: 2rem;
    color: var(--text);
  }

  .subtitle {
    margin: 12px 0 0;
    font-size: 1.05rem;
    color: var(--text-secondary);
  }

  .booking-info {
    margin-top: 32px;
    padding: 20px;
    border: 1px solid #d1d5db;
    border-radius: var(--radius);
    background: var(--surface);
  }

  .booking-id {
    margin: 0;
    font-size: 1.1rem;
  }

  .note {
    margin: 10px 0 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .actions {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-primary,
  .action-secondary,
  .action-calendar {
    display: block;
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: var(--radius);
    transition: opacity 0.15s;
  }

  .action-primary {
    background: var(--primary);
    color: #fff;
  }

  .action-secondary {
    background: #fff;
    color: var(--primary);
    border: 1px solid var(--primary);
  }

  .action-calendar {
    background: #0f766e;
    color: #fff;
  }

  .action-primary:hover,
  .action-secondary:hover,
  .action-calendar:hover {
    opacity: 0.9;
  }
</style>
