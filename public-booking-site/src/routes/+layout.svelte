<script lang="ts">
  import PublicFooter from "../lib/components/layout/public-footer.svelte";
  import PublicHeader from "../lib/components/layout/public-header.svelte";

  export let data: {
    slug: string;
    bookingConfig: {
      tenantName: string;
      branding: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        backgroundColor: string;
        surfaceColor: string;
        textColor: string;
        textSecondaryColor: string;
        borderRadius: string;
        fontFamily: string;
        logoUrl: string | null;
        coverImageUrl?: string | null;
        faviconUrl?: string | null;
      };
    };
  };

  const branding = data.bookingConfig.branding;
  const tenantName = data.bookingConfig.tenantName;
  const pageTitle = `${tenantName} | Reservas online`;
  const pageDescription = `Reserva turnos online en ${tenantName} de forma rapida y simple.`;
  const canonicalUrl = `https://${data.slug}.site.agendateya.app`;
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta name="robots" content="index,follow" />
  <meta name="theme-color" content={branding.primaryColor} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={canonicalUrl} />

  {#if branding.coverImageUrl}
    <meta property="og:image" content={branding.coverImageUrl} />
  {/if}

  {#if branding.faviconUrl}
    <link rel="icon" href={branding.faviconUrl} />
  {/if}

  <link rel="canonical" href={canonicalUrl} />
</svelte:head>

<a class="skip-link" href="#page-content">Saltar al contenido</a>

<div
  style:--primary={branding.primaryColor}
  style:--secondary={branding.secondaryColor}
  style:--accent={branding.accentColor}
  style:--background={branding.backgroundColor}
  style:--surface={branding.surfaceColor}
  style:--text={branding.textColor}
  style:--text-secondary={branding.textSecondaryColor}
  style:--radius={branding.borderRadius}
  style:font-family={branding.fontFamily}
  class="min-h-screen"
>
  <PublicHeader
    tenantName={data.bookingConfig.tenantName}
    logoUrl={branding.logoUrl}
  />
  <div id="page-content" tabindex="-1">
    <slot />
  </div>
  <PublicFooter />
</div>

<style>
  .skip-link {
    position: absolute;
    left: 8px;
    top: -40px;
    z-index: 999;
    background: #111827;
    color: #fff;
    padding: 8px 10px;
    border-radius: 6px;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .skip-link:focus-visible {
    top: 8px;
  }
</style>
