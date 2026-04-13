<script lang="ts">
  export let status = 500;

  $: title =
    status === 404
      ? "Este negocio no existe o aun no esta publicado"
      : "No pudimos cargar el sitio";
  $: description =
    status === 404
      ? "Verifica el enlace o intenta nuevamente mas tarde."
      : "Ocurrio un problema temporal de red o del servidor. Intenta nuevamente.";
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="error-wrap">
  <h1>{title}</h1>
  <p>{description}</p>
  <a href="/">Ir al inicio</a>
</main>

<style>
  .error-wrap {
    min-height: 70vh;
    display: grid;
    place-content: center;
    gap: 10px;
    text-align: center;
    padding: 20px;
  }

  .error-wrap a {
    justify-self: center;
    border-radius: var(--radius);
    background: var(--primary);
    color: #fff;
    text-decoration: none;
    padding: 10px 16px;
  }
</style>
