<script lang="ts">
  export let data: {
    bookingId: string;
  };
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
    <p class="note">Guardá este número para consultar o cancelar tu turno.</p>
  </section>

  <section class="actions">
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
  .action-secondary {
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

  .action-primary:hover,
  .action-secondary:hover {
    opacity: 0.9;
  }
</style>
